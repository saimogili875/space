"""
Anomaly Detection Service: uses Isolation Forest + statistical Z-score
to flag unusual production patterns, weather deviations, and equipment anomalies.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from datetime import datetime

from app.config import MOIL_MINES, SYNTHETIC_DIR


def _load_production() -> pd.DataFrame:
    csv = SYNTHETIC_DIR / "production.csv"
    if not csv.exists():
        return pd.DataFrame()
    return pd.read_csv(csv, parse_dates=["date"])


def _load_weather() -> pd.DataFrame:
    csv = SYNTHETIC_DIR / "weather.csv"
    if not csv.exists():
        return pd.DataFrame()
    return pd.read_csv(csv, parse_dates=["date"])


def detect_anomalies(mine_id: str, lookback_months: int = 12) -> dict:
    prod = _load_production()
    weather = _load_weather()

    if prod.empty:
        return {"mine_id": mine_id, "anomalies": [], "summary": {}}

    mine_prod = prod[prod["mine_id"] == mine_id].sort_values("date").copy()
    mine_weather = weather[weather["mine_id"] == mine_id].sort_values("date").copy()

    if len(mine_prod) < 6:
        return {"mine_id": mine_id, "anomalies": [], "summary": {}}

    anomalies = []

    # --- 1. Production anomalies via Z-score ---
    mine_prod["prod_zscore"] = (
        (mine_prod["actual_tonnes"] - mine_prod["actual_tonnes"].rolling(6, min_periods=3).mean())
        / mine_prod["actual_tonnes"].rolling(6, min_periods=3).std().replace(0, 1)
    )
    mine_prod["shortfall_pct"] = (
        (mine_prod["actual_tonnes"] - mine_prod["target_tonnes"])
        / mine_prod["target_tonnes"] * 100
    )

    recent = mine_prod.tail(lookback_months)
    for _, row in recent.iterrows():
        z = row.get("prod_zscore", 0)
        if pd.isna(z):
            continue
        if abs(z) > 2.0:
            severity = "CRITICAL" if abs(z) > 3.0 else "WARNING"
            direction = "drop" if z < 0 else "spike"
            anomalies.append({
                "type": "production",
                "date": row["date"].strftime("%Y-%m"),
                "severity": severity,
                "metric": "actual_tonnes",
                "value": round(float(row["actual_tonnes"]), 0),
                "expected": round(float(row["target_tonnes"]), 0),
                "z_score": round(float(z), 2),
                "description": f"Production {direction} of {abs(z):.1f}σ from rolling mean ({int(row['actual_tonnes']):,}t vs {int(row['target_tonnes']):,}t target)",
            })

    # --- 2. Isolation Forest on multivariate features ---
    if len(mine_prod) >= 12:
        feat_cols = ["actual_tonnes", "target_tonnes"]
        if "shortfall_pct" in mine_prod.columns:
            feat_cols.append("shortfall_pct")

        feat_df = mine_prod[feat_cols].dropna()
        if len(feat_df) >= 12:
            iso = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
            scores = iso.fit_predict(feat_df)
            decision_scores = iso.decision_function(feat_df)

            outlier_idx = feat_df.index[scores == -1]
            recent_idx = mine_prod.tail(lookback_months).index

            for idx in outlier_idx:
                if idx in recent_idx:
                    row = mine_prod.loc[idx]
                    score = float(decision_scores[feat_df.index.get_loc(idx)])
                    already_flagged = any(
                        a["date"] == row["date"].strftime("%Y-%m") and a["type"] == "production"
                        for a in anomalies
                    )
                    if not already_flagged:
                        anomalies.append({
                            "type": "multivariate",
                            "date": row["date"].strftime("%Y-%m"),
                            "severity": "WARNING",
                            "metric": "isolation_forest",
                            "value": round(float(row["actual_tonnes"]), 0),
                            "expected": round(float(row["target_tonnes"]), 0),
                            "z_score": round(score, 3),
                            "description": f"Multivariate anomaly detected (isolation score: {score:.3f})",
                        })

    # --- 3. Weather anomalies ---
    if not mine_weather.empty and len(mine_weather) >= 30:
        monthly_weather = mine_weather.set_index("date").resample("MS").agg({
            "rainfall_mm": "sum",
            "temperature_c": "mean",
            "soil_moisture": "mean",
        }).dropna()

        if len(monthly_weather) >= 6:
            for col, label in [("rainfall_mm", "Rainfall"), ("temperature_c", "Temperature")]:
                mean = monthly_weather[col].mean()
                std = monthly_weather[col].std()
                if std == 0:
                    continue
                for date_idx, row in monthly_weather.tail(lookback_months).iterrows():
                    z = (row[col] - mean) / std
                    if abs(z) > 2.0:
                        direction = "above" if z > 0 else "below"
                        anomalies.append({
                            "type": "weather",
                            "date": date_idx.strftime("%Y-%m"),
                            "severity": "WARNING" if abs(z) < 3.0 else "CRITICAL",
                            "metric": col,
                            "value": round(float(row[col]), 1),
                            "expected": round(float(mean), 1),
                            "z_score": round(float(z), 2),
                            "description": f"{label} {abs(z):.1f}σ {direction} normal ({row[col]:.1f} vs avg {mean:.1f})",
                        })

    # --- Sort by date desc, severity ---
    severity_order = {"CRITICAL": 0, "WARNING": 1}
    anomalies.sort(key=lambda a: (a["date"], severity_order.get(a["severity"], 2)), reverse=True)

    # --- Summary ---
    critical_count = sum(1 for a in anomalies if a["severity"] == "CRITICAL")
    warning_count = sum(1 for a in anomalies if a["severity"] == "WARNING")
    types = {}
    for a in anomalies:
        types[a["type"]] = types.get(a["type"], 0) + 1

    summary = {
        "total_anomalies": len(anomalies),
        "critical": critical_count,
        "warning": warning_count,
        "by_type": types,
        "lookback_months": lookback_months,
        "health_score": max(0, round(100 - (critical_count * 15 + warning_count * 5), 1)),
    }

    return {
        "mine_id": mine_id,
        "mine_name": MOIL_MINES.get(mine_id, {}).get("name", mine_id),
        "anomalies": anomalies,
        "summary": summary,
    }


def get_fleet_anomaly_summary() -> dict:
    results = {}
    total_critical = 0
    total_warning = 0

    for mine_id in MOIL_MINES:
        result = detect_anomalies(mine_id, lookback_months=6)
        results[mine_id] = {
            "name": MOIL_MINES[mine_id]["name"],
            "health_score": result["summary"].get("health_score", 100),
            "critical": result["summary"].get("critical", 0),
            "warning": result["summary"].get("warning", 0),
            "total": result["summary"].get("total_anomalies", 0),
            "latest_anomaly": result["anomalies"][0] if result["anomalies"] else None,
        }
        total_critical += result["summary"].get("critical", 0)
        total_warning += result["summary"].get("warning", 0)

    return {
        "mines": results,
        "fleet_summary": {
            "total_critical": total_critical,
            "total_warning": total_warning,
            "avg_health_score": round(
                sum(m["health_score"] for m in results.values()) / len(results), 1
            ) if results else 100,
        },
    }

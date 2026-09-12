"""
What-If Simulator: Re-runs the prediction model with user-modified feature values.
Supports adjusting rainfall, temperature, equipment health, and soil moisture
to see how production forecast changes.
"""

import numpy as np
import pandas as pd
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import MOIL_MINES
from app.ml.feature_eng import build_features, FEATURE_COLS
from app.ml.xgb_model import load_model, predict, get_shap_values

_model = None
_features_df = None


def _get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


def _get_features():
    global _features_df
    if _features_df is None:
        _features_df = build_features()
    return _features_df


ADJUSTABLE_FEATURES = {
    "rainfall": {
        "label": "Rainfall Change",
        "unit": "%",
        "min": -80,
        "max": 200,
        "default": 0,
        "affects": ["rainfall_mm_mean", "rainfall_mm_max", "rainfall_mm_sum", "rainy_days", "heavy_rain_days",
                     "rainfall_mm_sum_lag1", "rainfall_mm_sum_lag2", "rainfall_mm_sum_lag3"],
    },
    "temperature": {
        "label": "Temperature Change",
        "unit": "C",
        "min": -5,
        "max": 8,
        "default": 0,
        "affects": ["temperature_c_mean", "temperature_c_max", "temperature_c_mean_lag1"],
    },
    "equipment_health": {
        "label": "Equipment Health Change",
        "unit": "%",
        "min": -30,
        "max": 20,
        "default": 0,
        "affects": ["operational_ratio", "avg_utilization", "avg_failure_prob"],
    },
    "soil_moisture": {
        "label": "Soil Moisture Change",
        "unit": "%",
        "min": -50,
        "max": 100,
        "default": 0,
        "affects": ["soil_moisture_mean"],
    },
    "monsoon_intensity": {
        "label": "Monsoon Intensity",
        "unit": "x",
        "min": 0.5,
        "max": 2.0,
        "default": 1.0,
        "affects": ["is_monsoon", "rainfall_mm_sum", "heavy_rain_days"],
    },
}


def simulate(mine_id: str, adjustments: dict) -> dict:
    """
    Run What-If simulation.
    adjustments: dict of {feature_key: value} from ADJUSTABLE_FEATURES
    """
    model = _get_model()
    df = _get_features()

    mine_df = df[df["mine_id"] == mine_id].sort_values("date").tail(4)
    if mine_df.empty:
        return {"error": f"No data for mine '{mine_id}'"}

    # Baseline prediction
    baseline_pred = predict(model, mine_df)
    baseline_shap = get_shap_values(model, mine_df)

    # Modified prediction
    modified_df = mine_df.copy()

    for key, value in adjustments.items():
        if key not in ADJUSTABLE_FEATURES:
            continue
        config = ADJUSTABLE_FEATURES[key]

        for col in config["affects"]:
            if col not in modified_df.columns:
                continue

            if config["unit"] == "%":
                multiplier = 1.0 + (value / 100.0)
                modified_df[col] = modified_df[col] * multiplier
            elif config["unit"] == "C":
                modified_df[col] = modified_df[col] + value
            elif config["unit"] == "x":
                modified_df[col] = modified_df[col] * value

        # Special handling for failure_prob (inverse of health)
        if key == "equipment_health":
            if "avg_failure_prob" in modified_df.columns:
                multiplier = 1.0 - (value / 100.0)
                modified_df["avg_failure_prob"] = mine_df["avg_failure_prob"] * max(multiplier, 0.01)

    modified_pred = predict(model, modified_df)
    modified_shap = get_shap_values(model, modified_df)

    results = []
    for i, (_, row) in enumerate(mine_df.iterrows()):
        if i >= min(len(baseline_pred), len(modified_pred)):
            break

        base = float(baseline_pred[i])
        mod = float(modified_pred[i])
        target = float(row["target_tonnes"])
        delta = mod - base
        delta_pct = (delta / base * 100) if base > 0 else 0

        base_shortfall = (base - target) / target * 100
        mod_shortfall = (mod - target) / target * 100

        results.append({
            "period": row["date"].strftime("%Y-%m"),
            "baseline_tonnes": round(base, 0),
            "modified_tonnes": round(mod, 0),
            "target_tonnes": round(target, 0),
            "delta_tonnes": round(delta, 0),
            "delta_pct": round(delta_pct, 2),
            "baseline_shortfall_pct": round(base_shortfall, 2),
            "modified_shortfall_pct": round(mod_shortfall, 2),
            "baseline_alert": _alert_level(base_shortfall),
            "modified_alert": _alert_level(mod_shortfall),
        })

    total_base = sum(r["baseline_tonnes"] for r in results)
    total_mod = sum(r["modified_tonnes"] for r in results)
    total_delta = total_mod - total_base

    # Value impact at Rs 7000/tonne manganese ore
    value_impact_crore = (total_delta * 7000) / 1e7

    return {
        "mine_id": mine_id,
        "mine_name": MOIL_MINES[mine_id]["name"],
        "adjustments": adjustments,
        "periods": results,
        "summary": {
            "total_baseline": round(total_base, 0),
            "total_modified": round(total_mod, 0),
            "total_delta": round(total_delta, 0),
            "delta_pct": round((total_delta / total_base * 100) if total_base > 0 else 0, 2),
            "value_impact_crore": round(value_impact_crore, 2),
            "improved_alerts": sum(1 for r in results if _severity(r["modified_alert"]) < _severity(r["baseline_alert"])),
            "worsened_alerts": sum(1 for r in results if _severity(r["modified_alert"]) > _severity(r["baseline_alert"])),
        },
        "baseline_shap": baseline_shap[:5],
        "modified_shap": modified_shap[:5],
    }


def _alert_level(shortfall_pct: float) -> str:
    if shortfall_pct < -10:
        return "CRITICAL"
    elif shortfall_pct < -5:
        return "WARNING"
    return "ON_TRACK"


def _severity(level: str) -> int:
    return {"ON_TRACK": 0, "WARNING": 1, "CRITICAL": 2}.get(level, 0)

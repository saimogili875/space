from fastapi import APIRouter, HTTPException, Query
from app.config import MOIL_MINES
from app.services.predictor import PredictionService
from app.services.anomaly import detect_anomalies
import pandas as pd
from app.config import SYNTHETIC_DIR

router = APIRouter(prefix="/api/compare", tags=["compare"])
service = PredictionService()


@router.get("")
def compare_mines(mine_ids: str = Query(..., description="Comma-separated mine IDs")):
    ids = [m.strip() for m in mine_ids.split(",") if m.strip()]
    if len(ids) < 2 or len(ids) > 5:
        raise HTTPException(400, "Provide 2-5 mine IDs separated by commas")

    for mid in ids:
        if mid not in MOIL_MINES:
            raise HTTPException(404, f"Mine '{mid}' not found")

    prod_csv = SYNTHETIC_DIR / "production.csv"
    prod_df = pd.read_csv(prod_csv, parse_dates=["date"]) if prod_csv.exists() else pd.DataFrame()

    results = []
    for mid in ids:
        info = MOIL_MINES[mid]
        forecasts = service.get_forecast(mid, periods=4)
        anomaly_data = detect_anomalies(mid, lookback_months=6)

        mine_prod = prod_df[prod_df["mine_id"] == mid].sort_values("date") if not prod_df.empty else pd.DataFrame()
        last_12 = mine_prod.tail(12)

        avg_production = round(float(last_12["actual_tonnes"].mean()), 0) if not last_12.empty else 0
        avg_target = round(float(last_12["target_tonnes"].mean()), 0) if not last_12.empty else 0
        avg_shortfall = round((avg_production - avg_target) / avg_target * 100, 1) if avg_target > 0 else 0
        trend = []
        for _, row in last_12.iterrows():
            trend.append({
                "period": row["date"].strftime("%Y-%m") if hasattr(row["date"], "strftime") else str(row["date"])[:7],
                "actual": round(float(row["actual_tonnes"]), 0),
                "target": round(float(row["target_tonnes"]), 0),
            })

        next_forecast = forecasts[0] if forecasts else None

        results.append({
            "mine_id": mid,
            "name": info["name"],
            "state": info["state"],
            "type": info["type"],
            "ore_grade_pct": info["ore_grade_pct"],
            "depth_m": info["depth_m"],
            "avg_production_12m": avg_production,
            "avg_target_12m": avg_target,
            "avg_shortfall_pct": avg_shortfall,
            "health_score": anomaly_data["summary"].get("health_score", 100),
            "anomaly_count": anomaly_data["summary"].get("total_anomalies", 0),
            "next_prediction": {
                "period": next_forecast.period,
                "predicted_tonnes": next_forecast.predicted_tonnes,
                "target_tonnes": next_forecast.target_tonnes,
                "shortfall_pct": next_forecast.shortfall_pct,
                "alert_level": next_forecast.alert_level.value,
            } if next_forecast else None,
            "trend_12m": trend,
        })

    return {"mines": results}

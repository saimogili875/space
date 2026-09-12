from fastapi import APIRouter, HTTPException, Query
import json
import pandas as pd
from app.config import MOIL_MINES, SYNTHETIC_DIR
from app.models.schemas import WeatherData
from app.services.gee_service import get_satellite_tile, get_weather_summary

router = APIRouter(prefix="/api/satellite", tags=["satellite"])


@router.get("/{mine_id}", response_model=list[WeatherData])
def get_satellite_data(mine_id: str, limit: int = Query(30, ge=1, le=365)):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")

    csv_path = SYNTHETIC_DIR / "weather.csv"
    if not csv_path.exists():
        raise HTTPException(500, "Weather data not generated yet. Run synthetic_data.py first.")

    df = pd.read_csv(csv_path)
    mine_df = df[df["mine_id"] == mine_id].sort_values("date").tail(limit)

    return [
        WeatherData(
            mine_id=row["mine_id"],
            date=row["date"],
            rainfall_mm=row["rainfall_mm"],
            temperature_c=row["temperature_c"],
            humidity_pct=row["humidity_pct"],
            soil_moisture=row["soil_moisture"],
            ndvi=row["ndvi"],
        )
        for _, row in mine_df.iterrows()
    ]


@router.get("/{mine_id}/production")
def get_production_history(mine_id: str, limit: int = Query(24, ge=1, le=72)):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")

    csv_path = SYNTHETIC_DIR / "production.csv"
    if not csv_path.exists():
        raise HTTPException(500, "Production data not generated yet.")

    df = pd.read_csv(csv_path)
    mine_df = df[df["mine_id"] == mine_id].sort_values("date").tail(limit)

    return mine_df.to_dict(orient="records")


@router.get("/{mine_id}/tile")
def get_tile(mine_id: str, date: str = Query("2024-01-15")):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return get_satellite_tile(mine_id, date)


@router.get("/{mine_id}/heatmap")
def get_heatmap(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")

    heatmap_path = SYNTHETIC_DIR / "heatmap_data.json"
    if not heatmap_path.exists():
        raise HTTPException(500, "Heatmap data not generated. Run reserve_mapper.py first.")

    with open(heatmap_path) as f:
        data = json.load(f)

    if mine_id not in data:
        raise HTTPException(404, f"No heatmap for '{mine_id}'")

    return data[mine_id]


@router.get("/{mine_id}/weather-summary")
def get_weather_summary_endpoint(mine_id: str, months: int = Query(6, ge=1, le=24)):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return get_weather_summary(mine_id, months)

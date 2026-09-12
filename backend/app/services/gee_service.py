"""
Google Earth Engine service.
In production: pulls real Sentinel-2 tiles via GEE Python API.
For hackathon demo: returns synthetic satellite data matching MOIL mine locations.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import MOIL_MINES


GEE_AVAILABLE = False
try:
    import ee
    GEE_AVAILABLE = True
except ImportError:
    pass


def init_gee(project: Optional[str] = None):
    if not GEE_AVAILABLE:
        return False
    try:
        ee.Initialize(project=project)
        return True
    except Exception:
        return False


def get_satellite_tile(mine_id: str, date_str: str, buffer_km: float = 5.0) -> dict:
    """
    Get Sentinel-2 data for a mine location.
    Returns band values + computed indices.
    """
    mine = MOIL_MINES.get(mine_id)
    if not mine:
        return {}

    if GEE_AVAILABLE:
        return _real_gee_fetch(mine, date_str, buffer_km)
    return _synthetic_tile(mine, mine_id, date_str)


def _real_gee_fetch(mine: dict, date_str: str, buffer_km: float) -> dict:
    """Real GEE fetch — requires authenticated ee session."""
    point = ee.Geometry.Point([mine["lon"], mine["lat"]])
    aoi = point.buffer(buffer_km * 1000)

    date = datetime.strptime(date_str, "%Y-%m-%d")
    start = date - timedelta(days=15)
    end = date + timedelta(days=15)

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )

    count = collection.size().getInfo()
    if count == 0:
        return {"error": "No cloud-free imagery available for this period"}

    image = collection.first()
    bands = ["B2", "B3", "B4", "B8", "B11", "B12"]
    values = image.select(bands).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi,
        scale=10,
        maxPixels=1e9,
    ).getInfo()

    b2 = values.get("B2", 0) / 10000
    b3 = values.get("B3", 0) / 10000
    b4 = values.get("B4", 0) / 10000
    b8 = values.get("B8", 0) / 10000
    b11 = values.get("B11", 0) / 10000
    b12 = values.get("B12", 0) / 10000

    return {
        "source": "gee",
        "satellite": "Sentinel-2",
        "date": date_str,
        "bands": {"B2": b2, "B3": b3, "B4": b4, "B8": b8, "B11": b11, "B12": b12},
        "indices": {
            "iron_oxide": round(b4 / max(b2, 0.001), 4),
            "hydroxyl": round(b11 / max(b12, 0.001), 4),
            "ferrous": round(b12 / max(b8, 0.001), 4),
            "mn_indicator": round((b11 + b12) / max(b8, 0.001), 4),
            "ndvi": round((b8 - b4) / max(b8 + b4, 0.001), 4),
        },
        "cloud_pct": image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo(),
    }


def _synthetic_tile(mine: dict, mine_id: str, date_str: str) -> dict:
    """Generate realistic synthetic satellite data for demo."""
    np.random.seed(hash(mine_id + date_str) % 2**31)

    grade = mine["ore_grade_pct"] / 100.0

    month = int(date_str.split("-")[1]) if "-" in date_str else 6
    is_monsoon = month in [6, 7, 8, 9]
    cloud_pct = np.random.uniform(40, 80) if is_monsoon else np.random.uniform(5, 25)

    b2 = np.random.uniform(0.04, 0.08) * (1.3 if is_monsoon else 1.0)
    b3 = np.random.uniform(0.05, 0.10) * (1.2 if is_monsoon else 1.0)
    b4 = np.random.uniform(0.08, 0.15) * (1 + grade * 0.5)
    b8 = np.random.uniform(0.15, 0.30) * (1.4 if is_monsoon else 1.0)
    b11 = np.random.uniform(0.20, 0.40) * (1 + grade * 0.3)
    b12 = np.random.uniform(0.15, 0.35) * (1 + grade * 0.2)

    return {
        "source": "synthetic",
        "satellite": "Sentinel-2 (simulated)",
        "date": date_str,
        "mine_id": mine_id,
        "location": {"lat": mine["lat"], "lon": mine["lon"]},
        "bands": {
            "B2": round(b2, 4), "B3": round(b3, 4), "B4": round(b4, 4),
            "B8": round(b8, 4), "B11": round(b11, 4), "B12": round(b12, 4),
        },
        "indices": {
            "iron_oxide": round(b4 / max(b2, 0.001), 4),
            "hydroxyl": round(b11 / max(b12, 0.001), 4),
            "ferrous": round(b12 / max(b8, 0.001), 4),
            "mn_indicator": round((b11 + b12) / max(b8, 0.001), 4),
            "ndvi": round((b8 - b4) / max(b8 + b4, 0.001), 4),
        },
        "cloud_pct": round(cloud_pct, 1),
    }


def get_weather_summary(mine_id: str, months: int = 6) -> list[dict]:
    """Get monthly weather summary for a mine (synthetic for demo)."""
    mine = MOIL_MINES.get(mine_id)
    if not mine:
        return []

    np.random.seed(hash(mine_id) % 2**31)
    today = datetime.now()
    summaries = []

    for m in range(months):
        date = today - timedelta(days=30 * m)
        month = date.month

        if month in [6, 7, 8, 9]:
            rainfall = np.random.uniform(150, 400)
            temp = np.random.uniform(24, 30)
            soil_moisture = np.random.uniform(0.35, 0.55)
            ndvi = np.random.uniform(0.5, 0.8)
        elif month in [11, 12, 1, 2]:
            rainfall = np.random.uniform(0, 20)
            temp = np.random.uniform(15, 25)
            soil_moisture = np.random.uniform(0.10, 0.25)
            ndvi = np.random.uniform(0.2, 0.4)
        else:
            rainfall = np.random.uniform(20, 100)
            temp = np.random.uniform(28, 38)
            soil_moisture = np.random.uniform(0.15, 0.35)
            ndvi = np.random.uniform(0.3, 0.5)

        summaries.append({
            "month": date.strftime("%Y-%m"),
            "rainfall_mm": round(rainfall, 1),
            "avg_temp_c": round(temp, 1),
            "soil_moisture": round(soil_moisture, 3),
            "ndvi": round(ndvi, 3),
        })

    return list(reversed(summaries))

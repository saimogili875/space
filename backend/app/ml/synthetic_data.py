"""
Generates realistic synthetic production, equipment, and weather data
for MOIL's 10 manganese mines. Based on publicly available MOIL annual
report figures and IMD climate patterns for Nagpur/Balaghat regions.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import json

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import MOIL_MINES, SYNTHETIC_DIR


def generate_weather_data(
    start_date: str = "2019-01-01",
    end_date: str = "2024-12-31",
) -> pd.DataFrame:
    dates = pd.date_range(start_date, end_date, freq="D")
    records = []

    for mine_id, mine in MOIL_MINES.items():
        np.random.seed(hash(mine_id) % 2**31)

        for date in dates:
            month = date.month
            doy = date.dayofyear

            # Rainfall: heavy monsoon June-Sept, dry Nov-Feb
            if month in (6, 7, 8, 9):
                base_rain = 12.0 if month in (7, 8) else 7.0
                rain = np.random.exponential(base_rain)
                rain = min(rain, 150.0)
            elif month in (10, 11):
                rain = np.random.exponential(1.5)
            else:
                rain = np.random.exponential(0.3)

            rain = max(0.0, rain)

            # Temperature: peaks in May, lowest in Dec-Jan
            temp_base = 25.0 + 10.0 * np.sin((doy - 100) * 2 * np.pi / 365)
            temp = temp_base + np.random.normal(0, 2.0)

            # Soil moisture: correlates with rainfall, lags by ~7 days
            soil_base = 0.15 + 0.35 * (1 / (1 + np.exp(-0.3 * (rain - 5))))
            soil_moisture = np.clip(soil_base + np.random.normal(0, 0.05), 0.05, 0.60)

            # NDVI: vegetation peaks in post-monsoon (Sept-Nov)
            if month in (9, 10, 11):
                ndvi_base = 0.55
            elif month in (6, 7, 8):
                ndvi_base = 0.45
            elif month in (3, 4, 5):
                ndvi_base = 0.25
            else:
                ndvi_base = 0.30
            ndvi = np.clip(ndvi_base + np.random.normal(0, 0.08), 0.05, 0.85)

            # Humidity
            humidity = np.clip(40 + 35 * (rain / 15.0) + np.random.normal(0, 8), 20, 98)

            records.append({
                "mine_id": mine_id,
                "date": date.strftime("%Y-%m-%d"),
                "rainfall_mm": round(rain, 2),
                "temperature_c": round(temp, 1),
                "soil_moisture": round(soil_moisture, 3),
                "ndvi": round(ndvi, 3),
                "humidity_pct": round(humidity, 1),
            })

    return pd.DataFrame(records)


def generate_production_data(
    weather_df: pd.DataFrame,
    start_date: str = "2019-01-01",
    end_date: str = "2024-12-31",
) -> pd.DataFrame:
    months = pd.date_range(start_date, end_date, freq="MS")
    records = []

    for mine_id, mine in MOIL_MINES.items():
        np.random.seed(hash(mine_id + "_prod") % 2**31)
        base = mine["base_monthly_tonnes"]
        mine_type = mine["type"]

        for i, month in enumerate(months):
            year_idx = (month.year - 2019)
            m = month.month

            # Year-on-year growth: 3-5%
            growth = 1.0 + 0.04 * year_idx

            # Monsoon impact: opencast hit hard, underground modest
            if m in (7, 8):
                if mine_type == "opencast":
                    monsoon_factor = np.random.uniform(0.50, 0.70)
                else:
                    monsoon_factor = np.random.uniform(0.85, 0.95)
            elif m in (6, 9):
                if mine_type == "opencast":
                    monsoon_factor = np.random.uniform(0.70, 0.85)
                else:
                    monsoon_factor = np.random.uniform(0.90, 0.98)
            else:
                monsoon_factor = np.random.uniform(0.95, 1.05)

            # Equipment failures: 10% chance per month of 5-20% drop
            equip_factor = 1.0
            if np.random.random() < 0.10:
                equip_factor = np.random.uniform(0.80, 0.95)

            # Monthly weather influence from actual weather data
            mine_weather = weather_df[
                (weather_df["mine_id"] == mine_id)
                & (weather_df["date"].str.startswith(month.strftime("%Y-%m")))
            ]
            if len(mine_weather) > 0:
                avg_rain = mine_weather["rainfall_mm"].mean()
                rain_penalty = max(0, (avg_rain - 10) * 0.008)
            else:
                rain_penalty = 0.0

            actual = base * growth * monsoon_factor * equip_factor * (1 - rain_penalty)
            actual += np.random.normal(0, base * 0.03)
            actual = max(actual, base * 0.30)

            # Target is always optimistic: 5-8% above realistic
            target = base * growth * np.random.uniform(1.02, 1.08)

            records.append({
                "mine_id": mine_id,
                "date": month.strftime("%Y-%m-%d"),
                "actual_tonnes": round(actual),
                "target_tonnes": round(target),
                "shortfall_pct": round((actual - target) / target * 100, 2),
                "monsoon_factor": round(monsoon_factor, 3),
                "equipment_factor": round(equip_factor, 3),
            })

    return pd.DataFrame(records)


def generate_equipment_data() -> pd.DataFrame:
    equipment_types = [
        "SDL (Side Discharge Loader)",
        "LHD (Load Haul Dump)",
        "Drill Jumbo",
        "Conveyor Belt",
        "Crusher",
        "Dumper",
        "Excavator",
        "Ventilation Fan",
        "Dewatering Pump",
        "Winding Engine",
    ]

    records = []
    eq_id = 1

    for mine_id, mine in MOIL_MINES.items():
        np.random.seed(hash(mine_id + "_equip") % 2**31)
        n_equip = np.random.randint(5, 11)
        chosen = np.random.choice(equipment_types, size=n_equip, replace=False)

        for eq_type in chosen:
            age = np.random.randint(1, 16)
            # Older equipment = lower utilization
            util = np.clip(90 - age * 2.5 + np.random.normal(0, 5), 40, 95)
            # Failure probability increases with age (Weibull-like)
            failure_prob = 1 - np.exp(-(age / 10) ** 2.5)
            status = np.random.choice(
                ["operational", "maintenance", "breakdown"],
                p=[1 - failure_prob, failure_prob * 0.6, failure_prob * 0.4],
            )
            next_maintenance_days = np.random.randint(7, 180)

            records.append({
                "equipment_id": f"EQ-{eq_id:04d}",
                "mine_id": mine_id,
                "type": eq_type,
                "age_years": age,
                "utilization_pct": round(util, 1),
                "status": status,
                "failure_probability": round(failure_prob, 3),
                "next_maintenance_days": next_maintenance_days,
            })
            eq_id += 1

    return pd.DataFrame(records)


def generate_all():
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)

    print("Generating weather data (6 years daily x 10 mines)...")
    weather = generate_weather_data()
    weather.to_csv(SYNTHETIC_DIR / "weather.csv", index=False)
    print(f"  -> {len(weather)} rows -> weather.csv")

    print("Generating production data (6 years monthly x 10 mines)...")
    production = generate_production_data(weather)
    production.to_csv(SYNTHETIC_DIR / "production.csv", index=False)
    print(f"  -> {len(production)} rows -> production.csv")

    print("Generating equipment data...")
    equipment = generate_equipment_data()
    equipment.to_csv(SYNTHETIC_DIR / "equipment.csv", index=False)
    print(f"  -> {len(equipment)} rows -> equipment.csv")

    # Also save mine metadata as JSON
    mines_meta = {}
    for mine_id, mine in MOIL_MINES.items():
        mines_meta[mine_id] = {**mine, "id": mine_id}
    with open(SYNTHETIC_DIR / "mines.json", "w") as f:
        json.dump(mines_meta, f, indent=2)
    print(f"  -> {len(mines_meta)} mines -> mines.json")

    print("\nDone. All synthetic data saved to:", SYNTHETIC_DIR)


if __name__ == "__main__":
    generate_all()

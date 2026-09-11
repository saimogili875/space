"""
Feature engineering pipeline: merges weather + production + equipment data
into ML-ready features with lag columns and rolling aggregates.
"""

import numpy as np
import pandas as pd
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import SYNTHETIC_DIR


def load_raw_data():
    weather = pd.read_csv(SYNTHETIC_DIR / "weather.csv", parse_dates=["date"])
    production = pd.read_csv(SYNTHETIC_DIR / "production.csv", parse_dates=["date"])
    equipment = pd.read_csv(SYNTHETIC_DIR / "equipment.csv")
    return weather, production, equipment


def aggregate_weather_monthly(weather: pd.DataFrame) -> pd.DataFrame:
    weather["year_month"] = weather["date"].dt.to_period("M")
    agg = weather.groupby(["mine_id", "year_month"]).agg(
        rainfall_mm_mean=("rainfall_mm", "mean"),
        rainfall_mm_max=("rainfall_mm", "max"),
        rainfall_mm_sum=("rainfall_mm", "sum"),
        temperature_c_mean=("temperature_c", "mean"),
        temperature_c_max=("temperature_c", "max"),
        soil_moisture_mean=("soil_moisture", "mean"),
        ndvi_mean=("ndvi", "mean"),
        humidity_pct_mean=("humidity_pct", "mean"),
        rainy_days=("rainfall_mm", lambda x: (x > 2.5).sum()),
        heavy_rain_days=("rainfall_mm", lambda x: (x > 25.0).sum()),
    ).reset_index()
    agg["date"] = agg["year_month"].dt.to_timestamp()
    return agg.drop(columns=["year_month"])


def aggregate_equipment(equipment: pd.DataFrame) -> pd.DataFrame:
    equip_agg = equipment.groupby("mine_id").agg(
        avg_equipment_age=("age_years", "mean"),
        avg_utilization=("utilization_pct", "mean"),
        avg_failure_prob=("failure_probability", "mean"),
        n_operational=("status", lambda x: (x == "operational").sum()),
        n_maintenance=("status", lambda x: (x == "maintenance").sum()),
        n_breakdown=("status", lambda x: (x == "breakdown").sum()),
        total_equipment=("equipment_id", "count"),
    ).reset_index()
    equip_agg["operational_ratio"] = equip_agg["n_operational"] / equip_agg["total_equipment"]
    return equip_agg


def add_lag_features(df: pd.DataFrame, group_col: str, target_col: str, lags: list[int]) -> pd.DataFrame:
    df = df.sort_values([group_col, "date"])
    for lag in lags:
        df[f"{target_col}_lag{lag}"] = df.groupby(group_col)[target_col].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame, group_col: str, target_col: str, windows: list[int]) -> pd.DataFrame:
    df = df.sort_values([group_col, "date"])
    for w in windows:
        df[f"{target_col}_roll{w}_mean"] = (
            df.groupby(group_col)[target_col]
            .transform(lambda x: x.rolling(w, min_periods=1).mean())
        )
        df[f"{target_col}_roll{w}_std"] = (
            df.groupby(group_col)[target_col]
            .transform(lambda x: x.rolling(w, min_periods=1).std())
        )
    return df


def build_features() -> pd.DataFrame:
    weather, production, equipment = load_raw_data()

    weather_monthly = aggregate_weather_monthly(weather)
    equip_agg = aggregate_equipment(equipment)

    df = production.merge(weather_monthly, on=["mine_id", "date"], how="left")
    df = df.merge(equip_agg, on="mine_id", how="left")

    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter
    df["is_monsoon"] = df["month"].isin([6, 7, 8, 9]).astype(int)
    df["year"] = df["date"].dt.year

    df = add_lag_features(df, "mine_id", "actual_tonnes", [1, 2, 3, 6, 12])
    df = add_rolling_features(df, "mine_id", "actual_tonnes", [3, 6, 12])

    df = add_lag_features(df, "mine_id", "rainfall_mm_sum", [1, 2, 3])
    df = add_lag_features(df, "mine_id", "temperature_c_mean", [1])

    # Year-on-year change
    df["yoy_change"] = df.groupby("mine_id")["actual_tonnes"].pct_change(12)

    df = df.dropna(subset=["actual_tonnes_lag1"])

    return df


FEATURE_COLS = [
    "month", "quarter", "is_monsoon",
    "rainfall_mm_mean", "rainfall_mm_max", "rainfall_mm_sum",
    "temperature_c_mean", "temperature_c_max",
    "soil_moisture_mean", "ndvi_mean", "humidity_pct_mean",
    "rainy_days", "heavy_rain_days",
    "avg_equipment_age", "avg_utilization", "avg_failure_prob",
    "operational_ratio",
    "actual_tonnes_lag1", "actual_tonnes_lag2", "actual_tonnes_lag3",
    "actual_tonnes_lag6", "actual_tonnes_lag12",
    "actual_tonnes_roll3_mean", "actual_tonnes_roll6_mean",
    "actual_tonnes_roll12_mean",
    "actual_tonnes_roll3_std", "actual_tonnes_roll6_std",
    "rainfall_mm_sum_lag1", "rainfall_mm_sum_lag2", "rainfall_mm_sum_lag3",
    "temperature_c_mean_lag1",
    "yoy_change",
]

TARGET_COL = "actual_tonnes"


if __name__ == "__main__":
    df = build_features()
    print(f"Feature matrix: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFeature columns used for training: {len(FEATURE_COLS)}")
    print(df[FEATURE_COLS + [TARGET_COL]].describe().round(2))

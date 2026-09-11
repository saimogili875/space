from pydantic import BaseModel
from typing import Optional
from enum import Enum


class MineType(str, Enum):
    UNDERGROUND = "underground"
    OPENCAST = "opencast"


class AlertLevel(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    ON_TRACK = "ON_TRACK"


class Mine(BaseModel):
    id: str
    name: str
    state: str
    type: MineType
    lat: float
    lon: float
    depth_m: int
    base_monthly_tonnes: int
    ore_grade_pct: float
    active_since: int


class SatelliteData(BaseModel):
    mine_id: str
    date: str
    ndvi: float
    soil_moisture: float
    land_surface_temp: float
    rainfall_mm: float
    iron_oxide_index: float
    hydroxyl_index: float
    ferrous_index: float
    mn_indicator: float


class ProductionForecast(BaseModel):
    mine_id: str
    period: str
    predicted_tonnes: float
    target_tonnes: float
    shortfall_pct: float
    alert_level: AlertLevel
    confidence_lower: float
    confidence_upper: float
    top_factors: list[dict]


class CorrectiveAction(BaseModel):
    id: int
    alert_level: AlertLevel
    cause: str
    action: str
    estimated_recovery_tonnes: float
    estimated_value_crore: float
    priority: int


class Alert(BaseModel):
    mine_id: str
    mine_name: str
    period: str
    alert_level: AlertLevel
    shortfall_pct: float
    primary_cause: str
    actions: list[CorrectiveAction]


class WeatherData(BaseModel):
    mine_id: str
    date: str
    rainfall_mm: float
    temperature_c: float
    humidity_pct: float
    soil_moisture: float
    ndvi: float


class ShapFeature(BaseModel):
    feature: str
    importance: float
    direction: str

from fastapi import APIRouter, HTTPException, Query
from app.config import MOIL_MINES
from app.services.anomaly import detect_anomalies, get_fleet_anomaly_summary

router = APIRouter(prefix="/api/anomaly", tags=["anomaly"])


@router.get("/{mine_id}")
def get_mine_anomalies(mine_id: str, months: int = Query(12, ge=1, le=36)):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return detect_anomalies(mine_id, lookback_months=months)


@router.get("")
def get_fleet_anomalies():
    return get_fleet_anomaly_summary()

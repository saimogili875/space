from fastapi import APIRouter, HTTPException
from app.config import MOIL_MINES
from app.models.schemas import Alert
from app.services.predictor import PredictionService

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
service = PredictionService()


@router.get("", response_model=list[Alert])
def get_all_alerts():
    return service.get_alerts()


@router.get("/{mine_id}", response_model=list[Alert])
def get_mine_alerts(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return service.get_alerts(mine_id)

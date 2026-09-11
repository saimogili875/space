from fastapi import APIRouter, HTTPException
from app.config import MOIL_MINES
from app.models.schemas import ProductionForecast
from app.services.predictor import PredictionService

router = APIRouter(prefix="/api/forecast", tags=["forecast"])
service = PredictionService()


@router.get("/{mine_id}", response_model=list[ProductionForecast])
def get_forecast(mine_id: str, periods: int = 4):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return service.get_forecast(mine_id, periods)


@router.get("/{mine_id}/shap")
def get_shap(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return service.get_shap(mine_id)

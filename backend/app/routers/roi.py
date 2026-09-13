from fastapi import APIRouter
from app.services.roi import calculate_roi

router = APIRouter(prefix="/api/roi", tags=["roi"])


@router.get("")
def get_roi():
    return calculate_roi()

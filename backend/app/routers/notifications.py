from fastapi import APIRouter, HTTPException
from app.config import MOIL_MINES
from app.services.notifications import generate_notifications, send_test_notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications():
    return generate_notifications()


@router.post("/test/{mine_id}")
def test_notification(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    return send_test_notification(mine_id)

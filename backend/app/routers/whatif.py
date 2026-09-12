from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import MOIL_MINES
from app.services.whatif import simulate, ADJUSTABLE_FEATURES

router = APIRouter(prefix="/api/whatif", tags=["whatif"])


class WhatIfRequest(BaseModel):
    mine_id: str
    adjustments: dict[str, float]


@router.get("/features")
def get_adjustable_features():
    return ADJUSTABLE_FEATURES


@router.post("/simulate")
def run_simulation(req: WhatIfRequest):
    if req.mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{req.mine_id}' not found")
    return simulate(req.mine_id, req.adjustments)

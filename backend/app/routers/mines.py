from fastapi import APIRouter, HTTPException
from app.config import MOIL_MINES
from app.models.schemas import Mine, MineType

router = APIRouter(prefix="/api/mines", tags=["mines"])


@router.get("", response_model=list[Mine])
def list_mines():
    return [
        Mine(id=mid, **{k: v for k, v in m.items()})
        for mid, m in MOIL_MINES.items()
    ]


@router.get("/{mine_id}", response_model=Mine)
def get_mine(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")
    m = MOIL_MINES[mine_id]
    return Mine(id=mine_id, **m)

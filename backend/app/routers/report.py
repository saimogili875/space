from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.config import MOIL_MINES
from app.services.report_generator import generate_report

router = APIRouter(prefix="/api/report", tags=["report"])


@router.get("/{mine_id}")
def download_report(mine_id: str):
    if mine_id not in MOIL_MINES:
        raise HTTPException(404, f"Mine '{mine_id}' not found")

    pdf_bytes = generate_report(mine_id)
    mine_name = MOIL_MINES[mine_id]["name"]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="MangaLens_{mine_name}_Report.pdf"'},
    )

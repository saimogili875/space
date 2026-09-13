from fastapi import APIRouter
from pydantic import BaseModel
from app.services.nlp_query import process_query

router = APIRouter(prefix="/api/nlp", tags=["nlp"])


class QueryRequest(BaseModel):
    query: str
    lang: str = "en"


@router.post("")
def nlp_query(req: QueryRequest):
    result = process_query(req.query)
    if req.lang == "hi" and "answer_hi" in result:
        result["answer_display"] = result["answer_hi"]
    elif req.lang == "mr" and "answer_mr" in result:
        result["answer_display"] = result["answer_mr"]
    else:
        result["answer_display"] = result["answer"]
    return result

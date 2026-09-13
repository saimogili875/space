from fastapi import APIRouter
from pydantic import BaseModel
from app.services.nlp_query import process_query
from app.services.tts import synthesize_speech

router = APIRouter(prefix="/api/nlp", tags=["nlp"])


class QueryRequest(BaseModel):
    query: str
    lang: str = "en"


class TTSRequest(BaseModel):
    text: str
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


@router.post("/tts")
def text_to_speech(req: TTSRequest):
    result = synthesize_speech(req.text, req.lang)
    if result:
        return result
    return {"error": "TTS unavailable", "audio": None}

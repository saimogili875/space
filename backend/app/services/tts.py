"""
Text-to-Speech service using Groq Whisper API.
Converts NLP answers to spoken audio in English, Hindi, and Marathi.
"""

import os
import re
import base64
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

GROQ_API_KEY = os.getenv("WHISPERFLOW_API_KEY", "")
GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech"


def _strip_markdown(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"^- ", "", text, flags=re.MULTILINE)
    return text.strip()


def synthesize_speech(text: str, lang: str = "en") -> dict | None:
    if not GROQ_API_KEY:
        return None

    try:
        import httpx

        clean_text = _strip_markdown(text)
        if len(clean_text) > 500:
            clean_text = clean_text[:500] + "..."

        response = httpx.post(
            GROQ_TTS_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "playai-tts",
                "input": clean_text,
                "voice": "Arista-PlayAI",
                "response_format": "wav",
            },
            timeout=15.0,
        )

        if response.status_code == 200:
            audio_b64 = base64.b64encode(response.content).decode("utf-8")
            return {
                "audio": audio_b64,
                "format": "wav",
                "lang": lang,
            }
        return None
    except Exception:
        return None

"""Health, capability and validation-evidence endpoints."""
import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import BACKEND_DIR, REPO_DIR, get_settings
from ..database import get_db

router = APIRouter(prefix="/api", tags=["meta"])
ARTIFACTS = BACKEND_DIR / "lexora_ml" / "artifacts"
METADATA = REPO_DIR / "data" / "metadata"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


@router.get("/health")
def health(db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    from lexora_speech.transcribe import _transcriber, _tried

    whisper = "loaded" if _transcriber else ("unavailable" if _tried else ("configured (loads on first use)" if settings.whisper_model else "disabled"))
    return {
        "status": "ok" if db_ok else "degraded",
        "database": {"ok": db_ok, "backend": settings.resolved_database_url.split(":")[0]},
        "whisper": {"state": whisper, "model": settings.whisper_model or None},
        "reading_level_model": "loaded" if (ARTIFACTS / "reading_level_model.json").exists() else "missing (rule-based fallback)",
        "practice_generator": "gemini + deterministic fallback" if settings.gemini_api_key else "deterministic (no API key)",
        "demo_seeded": settings.seed_demo,
    }


@router.get("/validation")
def validation():
    """Component-validation evidence produced by the scripts in scripts/validation and lexora_ml."""
    return {
        "disclaimer": "These validate individual components on real datasets. None of them establishes clinical or diagnostic validity for Lexora.",
        "reading_level_model": _load(ARTIFACTS / "reading_level_meta.json"),
        "nlp_misspellings": _load(METADATA / "validation_nlp_misspellings.json"),
        "speech_aser": _load(METADATA / "validation_speech_aser.json"),
        "speech_nnces_pilot": _load(METADATA / "validation_speech_nnces_pilot.json"),
        "rello_methodology": _load(ARTIFACTS / "rello_validation.json"),
    }


@router.get("/demo-accounts")
def demo_accounts():
    settings = get_settings()
    if not settings.seed_demo:
        return {"enabled": False}
    return {"enabled": True, "password": settings.demo_password, "accounts": [
        {"role": "teacher", "email": "teacher@lexora.demo"},
        {"role": "parent", "email": "parent@lexora.demo"},
        {"role": "child", "email": "asha@child.lexora"},
    ]}

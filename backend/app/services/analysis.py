"""Per-response analysis: text features for writing tasks, speech features for
recordings, and ASER-style ladder bookkeeping."""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from lexora_nlp import analyze_text
from lexora_speech import get_transcriber, speech_features, to_wav16k
from lexora_speech.transcribe import DemoTranscriber

from ..config import get_settings
from .storage import get_storage
from ..content import LADDER, LADDER_PASS_THRESHOLD
from ..models import ScreeningResponse, ScreeningSession, ScreeningTask, SpeechAnalysisResult, TextAnalysisResult

log = logging.getLogger("lexora.analysis")


def analyse_text_response(db: Session, response: ScreeningResponse) -> dict:
    feats = analyze_text(response.task.prompt_text, response.response_text or "")
    if response.text_result:
        response.text_result.features = feats
    else:
        response.text_result = TextAnalysisResult(features=feats)
    db.flush()
    return feats


def analyse_audio_file(audio_key: str, prompt_text: str, item_level: str, allow_demo: bool) -> tuple[dict, str]:
    """ffmpeg + Whisper + features for a stored recording. Pure: touches no database
    row, so callers can run it (for seconds) without holding a write transaction.
    Returns (features, engine)."""
    settings = get_settings()
    wav = to_wav16k(get_storage().local_path(audio_key))
    transcriber = get_transcriber(settings.whisper_model, settings.whisper_device)
    if transcriber is None:
        if not allow_demo:
            raise RuntimeError("Whisper is not available on this server")
        transcriber = DemoTranscriber()
    transcript = transcriber.transcribe(str(wav), prompt_text)
    feats = speech_features(str(wav), transcript, prompt_text, item_level)
    return feats, transcript.engine


def store_speech_result(db: Session, response: ScreeningResponse, feats: dict, engine: str) -> None:
    response.duration_seconds = feats["duration_seconds"]
    if response.speech_result:
        response.speech_result.engine = engine
        response.speech_result.transcript = feats.get("transcript", "")
        response.speech_result.features = feats
    else:
        response.speech_result = SpeechAnalysisResult(engine=engine, transcript=feats.get("transcript", ""),
                                                      features=feats)
    db.flush()


def analyse_audio_response(db: Session, response: ScreeningResponse, allow_demo: bool) -> dict:
    """Convenience wrapper used by tests/scripts; the audio route calls the two
    halves separately so no write lock is held while Whisper runs."""
    feats, engine = analyse_audio_file(response.audio_path, response.task.prompt_text,
                                       response.task.item_level, allow_demo)
    store_speech_result(db, response, feats, engine)
    return feats


def analyse_examiner_mark(db: Session, response: ScreeningResponse, correct: bool, mistakes: int) -> dict:
    """ASER-style manual marking of a reading item (the primary path for letters)."""
    feats = {"engine": "examiner", "item_correct": correct, "mistakes": mistakes,
             "duration_seconds": response.duration_seconds}
    response.examiner_correct = correct
    if response.speech_result:
        response.speech_result.engine = "examiner"
        response.speech_result.features = {**response.speech_result.features, **feats}
    else:
        response.speech_result = SpeechAnalysisResult(engine="examiner", transcript="", features=feats)
    db.flush()
    return feats


def item_correct(task: ScreeningTask) -> bool | None:
    """Correctness of a reading item: examiner mark wins over Whisper's judgement."""
    r = task.response
    if r is None:
        return None
    if r.examiner_correct is not None:
        return r.examiner_correct
    if r.speech_result and "item_correct" in r.speech_result.features:
        return bool(r.speech_result.features["item_correct"])
    return None


def apply_ladder_rule(session: ScreeningSession) -> None:
    """Mirror ASER: once a level is failed (< 80% correct), higher reading levels
    are skipped. Called after every reading response.

    Only examiner marks count here. Whisper's judgement is advisory (it misses
    about two thirds of correctly read letters on real ASER clips), so a child
    recording alone attempts every level and the teacher reviews the marks on the
    report afterwards."""
    levels = [lvl for lvl, _, _ in LADDER]
    failed_at = None
    for lvl in levels:
        items = [t for t in session.tasks if t.kind == "reading" and t.item_level == lvl]
        judged = [t.response.examiner_correct if t.response else None for t in items]
        if any(j is None for j in judged):
            return  # level still in progress, or judged by Whisper only
        if sum(judged) / len(judged) < LADDER_PASS_THRESHOLD:
            failed_at = levels.index(lvl)
            break
    if failed_at is None:
        return
    for t in session.tasks:
        if t.kind == "reading" and levels.index(t.item_level) > failed_at and t.status == "pending":
            t.status = "skipped"


from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..content import build_tasks
from ..database import get_db
from ..models import ScreeningResponse, ScreeningSession, ScreeningTask, User
from ..schemas import ExaminerMarkIn, ReportOut, SessionOut, TaskOut, TextResponseIn, TranscriptCorrectionIn
from ..services.access import get_child_or_403
from ..services.analysis import (
    analyse_audio_file,
    analyse_examiner_mark,
    apply_transcript_correction,
    store_speech_result,
    analyse_text_response,
    apply_ladder_rule,
)
from ..services.demo import fill_demo_responses
from ..services.scoring import build_report, score_session
from ..services.storage import get_storage, recording_key

router = APIRouter(prefix="/api/screenings", tags=["screenings"])
ALLOWED_AUDIO = {".webm": "audio/webm", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp3": "audio/mpeg",
                 ".m4a": "audio/mp4", ".mp4": "audio/mp4"}
MAX_AUDIO_BYTES = 15 * 1024 * 1024


class CreateSessionIn(BaseModel):
    child_id: int


def _response_summary(t: ScreeningTask) -> dict | None:
    r = t.response
    if r is None:
        return None
    out = {"id": r.id, "response_text": r.response_text, "has_audio": bool(r.audio_path),
           "examiner_correct": r.examiner_correct, "duration_seconds": r.duration_seconds,
           "submitted_at": r.submitted_at}
    if r.text_result:
        f = r.text_result.features
        out["text"] = {k: f[k] for k in ("accuracy", "word_error_rate", "spelling_error_count", "pattern_counts", "word_errors")}
    if r.speech_result:
        f = r.speech_result.features
        out["speech"] = {"engine": r.speech_result.engine, "transcript": r.speech_result.transcript,
                         "item_correct": f.get("item_correct"), "word_error_rate": f.get("word_error_rate"),
                         "words_per_minute": f.get("words_per_minute"), "long_pauses": f.get("long_pauses"),
                         "duration_seconds": f.get("duration_seconds")}
    return out


def _session_out(s: ScreeningSession) -> SessionOut:
    tasks = [TaskOut(id=t.id, kind=t.kind, order_index=t.order_index, item_level=t.item_level,
                     prompt_text=t.prompt_text, prompt_source=t.prompt_source, status=t.status,
                     response=_response_summary(t)) for t in s.tasks]
    progress = {"total": len(tasks), "answered": sum(t.status == "answered" for t in tasks),
                "skipped": sum(t.status == "skipped" for t in tasks),
                "pending": sum(t.status == "pending" for t in tasks)}
    return SessionOut(id=s.id, child_id=s.child_id, child_name=s.child.first_name, status=s.status, mode=s.mode,
                      started_at=s.started_at, completed_at=s.completed_at, tasks=tasks, progress=progress,
                      has_result=s.risk_score is not None)


def _get_session(db: Session, user: User, session_id: int) -> ScreeningSession:
    s = db.get(ScreeningSession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Screening not found")
    get_child_or_403(db, user, s.child_id)
    return s


def _get_task(s: ScreeningSession, task_id: int) -> ScreeningTask:
    t = next((t for t in s.tasks if t.id == task_id), None)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found in this screening")
    if s.status == "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "This screening is already completed")
    return t


def _ensure_response(db: Session, t: ScreeningTask) -> ScreeningResponse:
    if t.response is None:
        t.response = ScreeningResponse(task_id=t.id)
        db.add(t.response)
        db.flush()
    t.status = "answered"
    return t.response


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(data: CreateSessionIn, user: User = Depends(require_roles("teacher", "child")),
                   db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, data.child_id)
    s = ScreeningSession(child_id=child.id, created_by_id=user.id)
    db.add(s)
    db.flush()
    for spec in build_tasks(seed=s.id * 7919 + child.id):
        db.add(ScreeningTask(session_id=s.id, **spec))
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _session_out(_get_session(db, user, session_id))


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def discard_session(session_id: int, user: User = Depends(require_roles("teacher")), db: Session = Depends(get_db)):
    """Discard an in-progress screening (and its recordings). Completed screenings are kept."""
    s = _get_session(db, user, session_id)
    if s.status == "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Completed screenings cannot be discarded")
    storage = get_storage()
    for t in s.tasks:
        if t.response and t.response.audio_path:
            storage.delete(t.response.audio_path)
    db.delete(s)
    db.commit()


@router.post("/{session_id}/tasks/{task_id}/text", response_model=SessionOut)
def submit_text(session_id: int, task_id: int, data: TextResponseIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    s = _get_session(db, user, session_id)
    t = _get_task(s, task_id)
    if t.kind != "writing":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only writing tasks accept typed answers")
    r = _ensure_response(db, t)
    r.response_text = data.response_text
    analyse_text_response(db, r)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/tasks/{task_id}/audio", response_model=SessionOut)
async def submit_audio(session_id: int, task_id: int, file: UploadFile = File(...),
                       duration_seconds: float | None = Form(default=None),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_session(db, user, session_id)
    t = _get_task(s, task_id)
    if t.kind not in ("reading", "speech"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This task does not take a recording")
    suffix = Path(file.filename or "").suffix.lower() or ".webm"
    if suffix not in ALLOWED_AUDIO:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Unsupported audio type {suffix}")
    data = await file.read()
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Recording larger than 15 MB")
    if len(data) < 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Recording is empty")
    key = get_storage().save(recording_key(s.id, t.id, suffix), data)
    try:
        # ffmpeg + Whisper take seconds: run them in a worker thread BEFORE any row
        # is written, so neither the event loop nor SQLite's write lock is held.
        feats, engine = await run_in_threadpool(analyse_audio_file, key, t.prompt_text, t.item_level, True)
    except Exception as exc:  # ffmpeg failure, corrupt file ...
        get_storage().delete(key)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Could not analyse recording: {exc}")
    db.expire_all()  # re-read: other uploads may have committed while we were transcribing
    s = _get_session(db, user, session_id)
    t = _get_task(s, task_id)
    r = _ensure_response(db, t)
    r.audio_path = key
    store_speech_result(db, r, feats, engine)  # sets the measured duration from the audio itself
    if not r.duration_seconds and duration_seconds:
        r.duration_seconds = duration_seconds  # browser-side timer as a fallback only
    if engine == "demo":
        s.mode = "demo"
    if t.kind == "reading":
        apply_ladder_rule(s)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/tasks/{task_id}/mark", response_model=SessionOut)
def examiner_mark(session_id: int, task_id: int, data: ExaminerMarkIn,
                  user: User = Depends(require_roles("teacher")), db: Session = Depends(get_db)):
    """ASER-style manual marking by the teacher (primary path for letter items).

    Also allowed on a completed screening so the teacher can review and override
    Whisper's advisory judgements; the session is then re-scored."""
    s = _get_session(db, user, session_id)
    t = next((t for t in s.tasks if t.id == task_id), None)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found in this screening")
    if t.kind != "reading":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only reading items are marked by the examiner")
    if t.status == "skipped" and s.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This item was skipped by the ladder rule and cannot be marked")
    r = _ensure_response(db, t)
    if data.duration_seconds is not None:
        r.duration_seconds = data.duration_seconds
    analyse_examiner_mark(db, r, data.correct, data.mistakes)
    if s.status == "completed":
        score_session(db, s)
    else:
        apply_ladder_rule(s)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/tasks/{task_id}/transcript", response_model=SessionOut)
def correct_transcript(session_id: int, task_id: int, data: TranscriptCorrectionIn,
                       user: User = Depends(require_roles("teacher")), db: Session = Depends(get_db)):
    """Teacher overrides Whisper's transcript with what the child actually said
    (Whisper both mishears accented speech and silently 'repairs' mispronunciations).
    Text-derived features are recomputed; a completed session is re-scored."""
    s = _get_session(db, user, session_id)
    t = next((t for t in s.tasks if t.id == task_id), None)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found in this screening")
    if t.kind not in ("speech", "reading") or t.response is None or t.response.speech_result is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This item has no transcript to correct")
    apply_transcript_correction(db, t.response, data.transcript.strip())
    if s.status == "completed":
        score_session(db, s)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/demo-fill", response_model=SessionOut)
def demo_fill(session_id: int, user: User = Depends(require_roles("teacher")), db: Session = Depends(get_db)):
    """Fill every remaining task with clearly-labelled demo responses so the full
    flow can be shown without a microphone. Marks the session mode as 'demo'."""
    s = _get_session(db, user, session_id)
    if s.status == "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "This screening is already completed")
    fill_demo_responses(db, s, severity=1.0)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/complete", response_model=ReportOut)
def complete(session_id: int, user: User = Depends(require_roles("teacher", "child")), db: Session = Depends(get_db)):
    s = _get_session(db, user, session_id)
    answered = [t for t in s.tasks if t.status == "answered"]
    if not answered:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No tasks have been answered yet")
    score_session(db, s)
    db.commit()
    db.refresh(s)
    return build_report(s)


@router.get("/{session_id}/report", response_model=ReportOut)
def report(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _get_session(db, user, session_id)
    if s.risk_score is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This screening has not been scored yet")
    return build_report(s)

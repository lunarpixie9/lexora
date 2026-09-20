from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models import PracticeActivity, PracticeAttempt, ProgressRecord, ScreeningSession, User
from ..schemas import AttemptIn, AttemptOut, PracticeOut
from ..services.access import get_child_or_403
from ..services.analysis import analyse_audio_file
from ..services.practice import SKILL_LABELS, generate_activities, score_attempt
from ..services.storage import get_storage

router = APIRouter(prefix="/api/practice", tags=["practice"])


class GenerateIn(BaseModel):
    child_id: int
    session_id: int | None = None


def _out(a: PracticeActivity) -> PracticeOut:
    o = PracticeOut.model_validate(a)
    o.attempt_count = len(a.attempts)
    o.best_score = max((x.score for x in a.attempts), default=None)
    return o


@router.get("/skills")
def skills():
    return SKILL_LABELS


@router.get("", response_model=list[PracticeOut])
def list_activities(child_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, child_id)
    rows = db.scalars(select(PracticeActivity).where(PracticeActivity.child_id == child.id)
                      .order_by(PracticeActivity.created_at.desc(), PracticeActivity.id.desc()))
    return [_out(a) for a in rows]


@router.post("/generate", response_model=list[PracticeOut], status_code=status.HTTP_201_CREATED)
def generate(data: GenerateIn, user: User = Depends(require_roles("teacher", "parent")),
             db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, data.child_id)
    session = None
    if data.session_id:
        session = db.get(ScreeningSession, data.session_id)
        if session is None or session.child_id != child.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Screening not found for this child")
    else:
        session = max((s for s in child.sessions if s.risk_score), key=lambda s: s.completed_at, default=None)
    if session is None or session.risk_score is None:
        # No screening yet: generic starter practice for the child's class, labelled as such
        profile = {"target_skills": ["sight_words", "reading_fluency"], "words_missed": [], "patterns": {},
                   "note": "No completed screening - starter practice"}
    else:
        profile = session.risk_score.explanation["error_profile"]
    existing = db.scalar(select(PracticeActivity).where(PracticeActivity.child_id == child.id))
    seed = child.id * 1000 + (session.id if session else 0) + (1 if existing else 0) * 17
    acts, source = generate_activities({"age": child.age, "class_grade": child.class_grade}, profile, seed)
    created = []
    for a in acts:
        row = PracticeActivity(child_id=child.id, session_id=session.id if session else None, kind=a.kind,
                               title=a.title, target_skills=a.target_skills, content=a.model_dump(), source=source)
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return [_out(a) for a in created]


@router.get("/{activity_id}", response_model=PracticeOut)
def get_activity(activity_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.get(PracticeActivity, activity_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    get_child_or_403(db, user, a.child_id)
    return _out(a)


@router.post("/{activity_id}/attempts", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
def submit_attempt(activity_id: int, data: AttemptIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    a = db.get(PracticeActivity, activity_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    get_child_or_403(db, user, a.child_id)
    result = score_attempt(a.content, data.answers)
    attempt = PracticeAttempt(activity_id=a.id, child_id=a.child_id, answers=data.answers, score=result["score"])
    db.add(attempt)
    db.add(ProgressRecord(child_id=a.child_id, metric=f"practice_{a.kind}", value=result["score"],
                          source=f"practice:{a.id}"))
    db.commit()
    db.refresh(attempt)
    return AttemptOut(id=attempt.id, activity_id=a.id, score=result["score"], correct=result["correct"],
                      total=result["total"], feedback=result["feedback"], completed_at=attempt.completed_at)


ALLOWED_AUDIO = {".webm", ".ogg", ".wav", ".mp3", ".m4a", ".mp4"}


@router.post("/{activity_id}/read-check")
async def read_check(activity_id: int, index: int = Form(...), file: UploadFile = File(...),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Child reads one practice sentence aloud; returns Whisper's transcript plus the
    pronunciation layer's word flags so the activity can give instant feedback. The
    recording is analysed and then deleted - practice audio is never kept."""
    a = db.get(PracticeActivity, activity_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    get_child_or_403(db, user, a.child_id)
    items = a.content.get("reading") or []
    if a.kind != "reading" or not 0 <= index < len(items):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a reading practice item")
    suffix = Path(file.filename or "").suffix.lower() or ".webm"
    if suffix not in ALLOWED_AUDIO:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Unsupported audio type {suffix}")
    data = await file.read()
    if len(data) < 200 or len(data) > 15 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Recording is empty or too large")
    sentence = items[index]["sentence"]
    storage = get_storage()
    key = storage.save(f"practice_tmp/{a.id}_{index}{suffix}", data)
    try:
        feats, engine = await run_in_threadpool(analyse_audio_file, key, sentence, "passage", True)
    except Exception as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Could not analyse recording: {exc}")
    finally:
        storage.delete(key)
        storage.delete(key.rsplit(".", 1)[0] + ".16k.wav")
    pron = feats.get("pronunciation") or {}
    flagged = pron.get("flagged_words") or []
    accuracy = feats.get("accuracy", 0.0)
    if engine == "demo":
        message = "Demo mode: no real speech recognition is running."
    elif not flagged and accuracy >= 0.75:
        message = "Lovely reading - every sound matched!"
    elif flagged:
        focus = sorted(flagged, key=lambda w: -len(w))[:3]  # name content words, not "a"/"i"
        message = "Nice try! Have another go at: " + ", ".join(focus)
    else:
        message = "Good effort - try reading it once more, a little slower."
    return {"sentence": sentence, "engine": engine, "transcript": feats.get("transcript", ""),
            "accuracy": accuracy, "pronunciation": pron or None, "flagged_words": flagged, "message": message}

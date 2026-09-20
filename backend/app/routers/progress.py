from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import PracticeActivity, PracticeAttempt, ProgressRecord, ScreeningSession, User
from ..schemas import ProgressOut
from ..services.access import get_child_or_403
from ..services.practice import SKILL_LABELS

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/{child_id}", response_model=ProgressOut)
def progress(child_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, child_id)
    sessions = db.scalars(select(ScreeningSession).where(ScreeningSession.child_id == child.id,
                                                          ScreeningSession.status == "completed")
                          .order_by(ScreeningSession.completed_at)).all()
    screenings = []
    for s in sessions:
        if not s.risk_score:
            continue
        ex = s.risk_score.explanation
        screenings.append({
            "session_id": s.id, "date": s.completed_at, "mode": s.mode, "score": s.risk_score.score,
            "band": s.risk_score.band, "reading_level": s.risk_score.reading_level_estimate,
            "expected_level": s.risk_score.expected_level_for_class,
            "reading_accuracy": next((r.value for r in db.scalars(select(ProgressRecord).where(
                ProgressRecord.child_id == child.id, ProgressRecord.metric == "reading_accuracy",
                ProgressRecord.source == f"screening:{s.id}"))), None),
            "spelling_accuracy": ex.get("writing", {}).get("accuracy"),
            "words_per_minute": ex.get("speech", {}).get("words_per_minute"),
            "groups": {g: round(sum(x["contribution"] for x in ex["indicator"]["signals"] if x["group"] == g), 4)
                       for g in ("reading", "writing", "speech")},
        })
    attempts = db.scalars(select(PracticeAttempt).where(PracticeAttempt.child_id == child.id)
                          .order_by(PracticeAttempt.completed_at)).all()
    activities = {a.id: a for a in db.scalars(select(PracticeActivity).where(PracticeActivity.child_id == child.id))}
    practice = [{"attempt_id": at.id, "activity_id": at.activity_id, "date": at.completed_at,
                 "kind": activities[at.activity_id].kind, "title": activities[at.activity_id].title,
                 "score": at.score, "skills": activities[at.activity_id].target_skills} for at in attempts]
    by_skill = defaultdict(list)
    for p in practice:
        for sk in p["skills"]:
            by_skill[sk].append(p["score"])
    skills = {sk: {"label": SKILL_LABELS.get(sk, sk), "attempts": len(v), "average": round(sum(v) / len(v), 3),
                   "latest": v[-1], "trend": round(v[-1] - v[0], 3) if len(v) > 1 else 0.0}
              for sk, v in by_skill.items()}
    return ProgressOut(child_id=child.id, screenings=screenings, practice=practice, skills=skills)

"""Demo data: three accounts and two demo children, one with screening history.

Everything created here is flagged is_demo / mode="demo" and is generated through
the real analysis pipeline from scripted responses. It is a presentation
convenience, not evidence (PROJECT_SPEC.md section 16).
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .config import get_settings
from .content import build_tasks
from .models import Child, Consent, PracticeActivity, PracticeAttempt, ProgressRecord, ScreeningSession, ScreeningTask, User
from .services.demo import fill_demo_responses
from .services.practice import generate_activities, score_attempt
from .services.scoring import score_session

log = logging.getLogger("lexora.seed")


def _user(db: Session, email: str, name: str, role: str, password: str) -> User:
    u = db.scalar(select(User).where(User.email == email))
    if u is None:
        u = User(email=email, full_name=name, role=role, password_hash=hash_password(password))
        db.add(u)
        db.flush()
    return u


def _demo_screening(db: Session, child: Child, teacher: User, days_ago: int, severity: float) -> ScreeningSession:
    s = ScreeningSession(child_id=child.id, created_by_id=teacher.id, mode="demo",
                         started_at=datetime.utcnow() - timedelta(days=days_ago, minutes=25))
    db.add(s)
    db.flush()
    for spec in build_tasks(seed=s.id * 7919 + child.id):
        db.add(ScreeningTask(session_id=s.id, **spec))
    db.flush()
    db.refresh(s)
    fill_demo_responses(db, s, severity=severity)
    rs = score_session(db, s)
    s.completed_at = datetime.utcnow() - timedelta(days=days_ago)
    rs.created_at = s.completed_at
    db.flush()
    db.refresh(s)
    for rec in db.scalars(select(ProgressRecord).where(ProgressRecord.source == f"screening:{s.id}")):
        rec.recorded_at = s.completed_at
    return s


def _demo_practice(db: Session, child: Child, session: ScreeningSession, days_ago: int, rng: random.Random) -> None:
    profile = session.risk_score.explanation["error_profile"]
    acts, source = generate_activities({"age": child.age, "class_grade": child.class_grade}, profile, seed=child.id * 1000 + session.id)
    for i, a in enumerate(acts):
        row = PracticeActivity(child_id=child.id, session_id=session.id, kind=a.kind, title=a.title,
                               target_skills=a.target_skills, content=a.model_dump(), source=source,
                               created_at=datetime.utcnow() - timedelta(days=days_ago))
        db.add(row)
        db.flush()
        if i >= 3:
            continue  # leave one activity untouched so the child has something to do
        content = row.content
        # scripted attempt: right most of the time, wrong on a couple of items
        answers = {}
        if a.kind == "word_practice":
            for k, item in enumerate(content["word_choice"]):
                answers[str(k)] = item["answer"] if rng.random() > 0.3 else rng.choice(item["options"])
        elif a.kind == "spelling":
            for k, item in enumerate(content["spelling"]):
                w = item["word"]
                answers[str(k)] = w if rng.random() > 0.35 else (w[:-1] if len(w) > 2 else w)
        elif a.kind == "reading":
            answers = {str(k): True for k in range(len(content["reading"]))}
        result = score_attempt(content, answers)
        when = datetime.utcnow() - timedelta(days=days_ago - 1 - i)
        db.add(PracticeAttempt(activity_id=row.id, child_id=child.id, answers=answers, score=result["score"], completed_at=when))
        db.add(ProgressRecord(child_id=child.id, metric=f"practice_{a.kind}", value=result["score"],
                              source=f"practice:{row.id}", recorded_at=when))


def seed_demo(db: Session) -> None:
    settings = get_settings()
    if db.scalar(select(Child).where(Child.is_demo.is_(True))):
        return
    pw = settings.demo_password
    teacher = _user(db, "teacher@lexora.demo", "Priya Sharma (demo teacher)", "teacher", pw)
    parent = _user(db, "parent@lexora.demo", "Rahul Mehta (demo parent)", "parent", pw)
    asha_user = _user(db, "asha@child.lexora", "Asha", "child", pw)
    rohan_user = _user(db, "rohan@child.lexora", "Rohan", "child", pw)

    asha = Child(first_name="Asha", age=8, class_grade=3, home_language="Hindi", teacher_id=teacher.id,
                 parent_id=parent.id, child_user_id=asha_user.id, is_demo=True,
                 notes="Demo child. All screening data below is generated demo content.")
    rohan = Child(first_name="Rohan", age=7, class_grade=2, home_language="Marathi", teacher_id=teacher.id,
                  parent_id=parent.id, child_user_id=rohan_user.id, is_demo=True,
                  notes="Demo child with no screening yet (empty-state example).")
    db.add_all([asha, rohan])
    db.flush()
    for c in (asha, rohan):
        db.add(Consent(child_id=c.id, granted_by_id=parent.id,
                       statement="Demo consent: parent agrees to educational screening and practice (demo data)."))

    rng = random.Random(42)
    first = _demo_screening(db, asha, teacher, days_ago=28, severity=1.15)
    _demo_practice(db, asha, first, days_ago=26, rng=rng)
    second = _demo_screening(db, asha, teacher, days_ago=3, severity=0.85)
    _demo_practice(db, asha, second, days_ago=2, rng=rng)
    db.commit()
    log.info("seeded demo accounts (password: %s) and demo children %s, %s", pw, asha.first_name, rohan.first_name)

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_roles
from ..database import get_db
from ..models import Child, Consent, ScreeningSession, User
from ..schemas import ChildIn, ChildOut
from ..services.access import get_child_or_403, visible_children

router = APIRouter(prefix="/api/children", tags=["children"])


def _child_out(db: Session, child: Child) -> ChildOut:
    out = ChildOut.model_validate(child)
    completed = [s for s in child.sessions if s.status == "completed" and s.risk_score]
    out.sessions_completed = len(completed)
    if completed:
        latest = max(completed, key=lambda s: s.completed_at)
        out.latest_band, out.latest_score = latest.risk_score.band, latest.risk_score.score
    if child.child_user_id:
        u = db.get(User, child.child_user_id)
        out.child_login_email = u.email if u else None
    return out


@router.get("", response_model=list[ChildOut])
def list_children(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_child_out(db, c) for c in visible_children(db, user)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_child(data: ChildIn, user: User = Depends(require_roles("teacher")), db: Session = Depends(get_db)):
    parent = None
    if data.parent_email:
        parent = db.scalar(select(User).where(User.email == data.parent_email.lower()))
        if parent is None or parent.role != "parent":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No parent account with that email")
    child = Child(first_name=data.first_name.strip(), age=data.age, class_grade=data.class_grade,
                  home_language=data.home_language, notes=data.notes, teacher_id=user.id,
                  parent_id=parent.id if parent else None)
    db.add(child)
    db.flush()
    # Child login: a simple account + 4-digit PIN, shown to the teacher once.
    pin = f"{secrets.randbelow(10000):04d}"
    login_email = f"{child.first_name.lower().replace(' ', '')}.{child.id}@child.lexora"
    child_user = User(email=login_email, password_hash=hash_password(pin), full_name=child.first_name, role="child")
    db.add(child_user)
    db.flush()
    child.child_user_id = child_user.id
    if data.consent_statement:
        db.add(Consent(child_id=child.id, granted_by_id=user.id, statement=data.consent_statement))
    db.commit()
    db.refresh(child)
    return {"child": _child_out(db, child), "child_login": {"email": login_email, "pin": pin}}


@router.get("/{child_id}", response_model=ChildOut)
def get_child(child_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _child_out(db, get_child_or_403(db, user, child_id))


@router.put("/{child_id}", response_model=ChildOut)
def update_child(child_id: int, data: ChildIn, user: User = Depends(require_roles("teacher")),
                 db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, child_id)
    child.first_name, child.age, child.class_grade = data.first_name.strip(), data.age, data.class_grade
    child.home_language, child.notes = data.home_language, data.notes
    if data.parent_email:
        parent = db.scalar(select(User).where(User.email == data.parent_email.lower()))
        if parent is None or parent.role != "parent":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No parent account with that email")
        child.parent_id = parent.id
    db.commit()
    db.refresh(child)
    return _child_out(db, child)


@router.get("/{child_id}/sessions")
def child_sessions(child_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    child = get_child_or_403(db, user, child_id)
    rows = db.scalars(select(ScreeningSession).where(ScreeningSession.child_id == child.id)
                      .order_by(ScreeningSession.started_at.desc()))
    return [{"id": s.id, "child_id": s.child_id, "status": s.status, "mode": s.mode, "started_at": s.started_at,
             "completed_at": s.completed_at, "score": s.risk_score.score if s.risk_score else None,
             "band": s.risk_score.band if s.risk_score else None} for s in rows]

"""Row-level access rules: who may see which child."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Child, User


def visible_children(db: Session, user: User) -> list[Child]:
    if user.role == "teacher":
        stmt = select(Child).where(Child.teacher_id == user.id)
    elif user.role == "parent":
        stmt = select(Child).where(Child.parent_id == user.id)
    else:
        stmt = select(Child).where(Child.child_user_id == user.id)
    return list(db.scalars(stmt.order_by(Child.created_at)))


def get_child_or_403(db: Session, user: User, child_id: int) -> Child:
    child = db.get(Child, child_id)
    if child is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Child not found")
    allowed = (
        (user.role == "teacher" and child.teacher_id == user.id)
        or (user.role == "parent" and child.parent_id == user.id)
        or (user.role == "child" and child.child_user_id == user.id)
    )
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this child")
    return child

"""Pydantic request/response models."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["teacher", "parent", "child"]


# ---- auth ----
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: Literal["teacher", "parent"]


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: Role
    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- children ----
class ChildIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    age: int = Field(ge=4, le=16)
    class_grade: int = Field(ge=1, le=8)
    home_language: str = "Hindi"
    notes: str = ""
    parent_email: EmailStr | None = None
    consent_statement: str | None = None


class ChildOut(BaseModel):
    id: int
    first_name: str
    age: int
    class_grade: int
    home_language: str
    notes: str
    is_demo: bool
    teacher_id: int
    parent_id: int | None
    child_user_id: int | None
    created_at: datetime
    latest_band: str | None = None
    latest_score: float | None = None
    sessions_completed: int = 0
    child_login_email: str | None = None
    model_config = {"from_attributes": True}


# ---- screening ----
class TaskOut(BaseModel):
    id: int
    kind: str
    order_index: int
    item_level: str
    prompt_text: str
    prompt_source: str
    status: str
    response: dict[str, Any] | None = None


class SessionOut(BaseModel):
    id: int
    child_id: int
    child_name: str
    status: str
    mode: str
    started_at: datetime
    completed_at: datetime | None
    tasks: list[TaskOut]
    progress: dict[str, int]
    has_result: bool


class SessionSummary(BaseModel):
    id: int
    child_id: int
    status: str
    mode: str
    started_at: datetime
    completed_at: datetime | None
    score: float | None = None
    band: str | None = None


class TextResponseIn(BaseModel):
    response_text: str = Field(max_length=2000)


class ExaminerMarkIn(BaseModel):
    correct: bool
    mistakes: int = Field(default=0, ge=0, le=50)
    duration_seconds: float | None = Field(default=None, ge=0, le=600)


# ---- results ----
class FeatureOut(BaseModel):
    name: str
    label: str
    group: str
    value: float
    raw_value: str
    weight: float
    contribution: float
    note: str = ""


class ReportOut(BaseModel):
    session_id: int
    child: dict[str, Any]
    generated_at: datetime
    indicator: dict[str, Any]
    features: list[FeatureOut]
    reading: dict[str, Any]
    writing: dict[str, Any]
    speech: dict[str, Any]
    error_profile: dict[str, Any]
    narrative: list[str]
    previous: dict[str, Any] | None = None
    disclaimer: str
    model_version: str
    data_sources: list[str]


# ---- practice ----
class PracticeOut(BaseModel):
    id: int
    child_id: int
    session_id: int | None
    kind: str
    title: str
    target_skills: list[str]
    content: dict[str, Any]
    source: str
    created_at: datetime
    attempt_count: int = 0
    best_score: float | None = None
    model_config = {"from_attributes": True}


class AttemptIn(BaseModel):
    answers: dict[str, Any]


class AttemptOut(BaseModel):
    id: int
    activity_id: int
    score: float
    correct: int
    total: int
    feedback: list[dict[str, Any]]
    completed_at: datetime


class ProgressOut(BaseModel):
    child_id: int
    screenings: list[dict[str, Any]]
    practice: list[dict[str, Any]]
    skills: dict[str, Any]

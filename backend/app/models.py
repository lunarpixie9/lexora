"""Relational models (PROJECT_SPEC.md section 7).

Reading, writing and speech tasks share one `screening_tasks` table with a
`kind` column; the three task types differ only in how the response is
analysed, so separate tables would triplicate the schema.
"""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(190), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20))  # teacher | parent | child
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Child(Base):
    __tablename__ = "children"
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(80))
    age: Mapped[int] = mapped_column(Integer)
    class_grade: Mapped[int] = mapped_column(Integer)  # school class 1-8, as in ASER
    home_language: Mapped[str] = mapped_column(String(40), default="Hindi")
    notes: Mapped[str] = mapped_column(Text, default="")
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    child_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    sessions: Mapped[list["ScreeningSession"]] = relationship(back_populates="child")


class Consent(Base):
    __tablename__ = "consents"
    id: Mapped[int] = mapped_column(primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"))
    granted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    statement: Mapped[str] = mapped_column(Text)
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ScreeningSession(Base):
    __tablename__ = "screening_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress | completed
    mode: Mapped[str] = mapped_column(String(20), default="live")  # live | demo
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    child: Mapped[Child] = relationship(back_populates="sessions")
    tasks: Mapped[list["ScreeningTask"]] = relationship(
        back_populates="session", order_by="ScreeningTask.order_index", cascade="all, delete-orphan"
    )
    risk_score: Mapped["RiskScore | None"] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class ScreeningTask(Base):
    __tablename__ = "screening_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("screening_sessions.id"))
    kind: Mapped[str] = mapped_column(String(20))  # reading | writing | speech
    order_index: Mapped[int] = mapped_column(Integer)
    # reading: CL | SL | W | S (ASER ladder levels); writing: word_dictation | sentence_dictation;
    # speech: passage
    item_level: Mapped[str] = mapped_column(String(20))
    prompt_text: Mapped[str] = mapped_column(Text)
    prompt_source: Mapped[str] = mapped_column(String(40), default="ASER")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | answered

    session: Mapped[ScreeningSession] = relationship(back_populates="tasks")
    response: Mapped["ScreeningResponse | None"] = relationship(
        back_populates="task", uselist=False, cascade="all, delete-orphan"
    )


class ScreeningResponse(Base):
    __tablename__ = "screening_responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("screening_tasks.id"), unique=True)
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # typed answer (writing)
    audio_path: Mapped[str | None] = mapped_column(String(255), nullable=True)  # stored recording
    examiner_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # ASER-style manual mark
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    task: Mapped[ScreeningTask] = relationship(back_populates="response")
    text_result: Mapped["TextAnalysisResult | None"] = relationship(
        back_populates="response", uselist=False, cascade="all, delete-orphan"
    )
    speech_result: Mapped["SpeechAnalysisResult | None"] = relationship(
        back_populates="response", uselist=False, cascade="all, delete-orphan"
    )


class TextAnalysisResult(Base):
    __tablename__ = "text_analysis_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("screening_responses.id"), unique=True)
    features: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    response: Mapped[ScreeningResponse] = relationship(back_populates="text_result")


class SpeechAnalysisResult(Base):
    __tablename__ = "speech_analysis_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("screening_responses.id"), unique=True)
    engine: Mapped[str] = mapped_column(String(60))  # faster-whisper:<size> | examiner | demo
    transcript: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    response: Mapped[ScreeningResponse] = relationship(back_populates="speech_result")


class RiskScore(Base):
    __tablename__ = "risk_scores"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("screening_sessions.id"), unique=True)
    score: Mapped[float] = mapped_column(Float)  # 0-1 composite of observed signals
    band: Mapped[str] = mapped_column(String(40))  # few_signals | some_signals | multiple_signals
    reading_level_estimate: Mapped[str] = mapped_column(String(40))
    expected_level_for_class: Mapped[str] = mapped_column(String(40))
    explanation: Mapped[dict] = mapped_column(JSON)  # narrative, SHAP values, error profile
    model_version: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    session: Mapped[ScreeningSession] = relationship(back_populates="risk_score")
    features: Mapped[list["RiskFeature"]] = relationship(
        back_populates="risk_score", order_by="RiskFeature.id", cascade="all, delete-orphan"
    )


class RiskFeature(Base):
    __tablename__ = "risk_features"
    id: Mapped[int] = mapped_column(primary_key=True)
    risk_score_id: Mapped[int] = mapped_column(ForeignKey("risk_scores.id"))
    name: Mapped[str] = mapped_column(String(60))
    label: Mapped[str] = mapped_column(String(120))
    value: Mapped[float] = mapped_column(Float)  # normalised 0-1 signal strength
    raw_value: Mapped[str] = mapped_column(String(160))  # human-readable measurement
    weight: Mapped[float] = mapped_column(Float)
    contribution: Mapped[float] = mapped_column(Float)  # weight * value: exact additive share
    group: Mapped[str] = mapped_column(String(20))  # reading | writing | speech
    risk_score: Mapped[RiskScore] = relationship(back_populates="features")


class PracticeActivity(Base):
    __tablename__ = "practice_activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"))
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("screening_sessions.id"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(30))  # word_practice | spelling | reading | story
    title: Mapped[str] = mapped_column(String(160))
    target_skills: Mapped[list] = mapped_column(JSON)
    content: Mapped[dict] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(30))  # deterministic | gemini
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    attempts: Mapped[list["PracticeAttempt"]] = relationship(back_populates="activity")


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("practice_activities.id"))
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"))
    answers: Mapped[dict] = mapped_column(JSON)
    score: Mapped[float] = mapped_column(Float)  # 0-1 fraction correct
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    activity: Mapped[PracticeActivity] = relationship(back_populates="attempts")


class ProgressRecord(Base):
    __tablename__ = "progress_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"))
    metric: Mapped[str] = mapped_column(String(60))  # screening_score | practice_score | ...
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(40))  # screening:<id> | practice:<id>
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=now)

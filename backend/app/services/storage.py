"""File storage abstraction (PROJECT_SPEC.md section 4).

Only a local-disk backend exists today. Everything that touches recordings goes
through `get_storage()`, so an S3-compatible backend can be added later by
implementing the same three methods without touching the routers/services.
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from ..config import get_settings


class Storage(Protocol):
    def save(self, relative_path: str, data: bytes) -> str: ...
    def local_path(self, relative_path: str) -> Path: ...
    def delete(self, relative_path: str) -> None: ...


class LocalStorage:
    """Files live under STORAGE_DIR; keys are POSIX-style relative paths."""

    def __init__(self, root: Path):
        self.root = root

    def save(self, relative_path: str, data: bytes) -> str:
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return relative_path

    def local_path(self, relative_path: str) -> Path:
        """Absolute path for local processing (ffmpeg/Whisper need a real file).
        An S3 backend would download to a temp file here."""
        return self.root / relative_path

    def delete(self, relative_path: str) -> None:
        path = self.root / relative_path
        if path.exists():
            path.unlink()


def get_storage() -> Storage:
    return LocalStorage(get_settings().storage_path)


def recording_key(session_id: int, task_id: int, suffix: str) -> str:
    return f"recordings/{session_id}/task_{task_id}{suffix}"

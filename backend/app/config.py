"""Application settings, loaded from environment variables / backend/.env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
DEV_SECRET = "dev-only-secret-change-me-before-exposing-this-server"  # 55 bytes


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = "sqlite:///./storage/lexora.db"
    secret_key: str = DEV_SECRET
    access_token_minutes: int = 720
    storage_dir: str = "./storage"

    whisper_model: str = "small"
    whisper_device: str = "cpu"
    # Phoneme recogniser for the pronunciation layer; empty string disables it
    pronunciation_model: str = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    seed_demo: bool = True
    demo_password: str = "lexora123"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def storage_path(self) -> Path:
        p = Path(self.storage_dir)
        if not p.is_absolute():
            p = BACKEND_DIR / p
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def resolved_database_url(self) -> str:
        # Make the default relative SQLite path independent of the working directory.
        url = self.database_url
        if url.startswith("sqlite:///./"):
            url = "sqlite:///" + (BACKEND_DIR / url[len("sqlite:///./"):]).as_posix()
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

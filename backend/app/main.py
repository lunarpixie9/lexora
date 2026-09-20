"""Lexora API entrypoint.

Run from the backend directory:  uvicorn app.main:app --reload
Interactive docs: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import DEV_SECRET, get_settings
from .database import Base, SessionLocal, engine
from .routers import auth, children, meta, practice, progress, screenings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("lexora")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(engine)
    if settings.seed_demo:
        from .seed import seed_demo

        with SessionLocal() as db:
            try:
                seed_demo(db)
            except Exception:  # never let seeding stop the API from starting
                db.rollback()
                log.exception("demo seeding failed")
    if settings.secret_key == DEV_SECRET:
        log.warning("SECRET_KEY is the built-in development value - set a random one in backend/.env before exposing the server")
    log.info("database: %s", settings.resolved_database_url.split("://")[0])
    log.info("whisper model: %s (loads lazily on first recording)", settings.whisper_model or "disabled")
    yield


app = FastAPI(
    title="Lexora API",
    version="0.1.0",
    description="AI-powered literacy screening aid and personalised practice engine. "
                "Lexora is a screening aid, not a diagnostic tool.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
for r in (auth, children, screenings, practice, progress, meta):
    app.include_router(r.router)


@app.get("/", include_in_schema=False)
def root():
    return {"name": "Lexora API", "docs": "/docs", "health": "/api/health"}

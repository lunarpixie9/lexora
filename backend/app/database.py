"""SQLAlchemy engine/session. SQLite by default; MySQL when DATABASE_URL says so."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()
url = settings.resolved_database_url
is_sqlite = url.startswith("sqlite")
# timeout: how long a writer waits for SQLite's single write lock before failing
connect_args = {"check_same_thread": False, "timeout": 30} if is_sqlite else {}
engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)

if is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        # WAL lets readers proceed while a writer commits; concurrent uploads from
        # the child-mode background queue depend on this.
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

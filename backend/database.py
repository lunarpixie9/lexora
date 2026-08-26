from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Using SQLite for development MVP, can be easily swapped to MySQL
# by changing the URL to mysql+pymysql://user:pass@localhost/db_name
SQLALCHEMY_DATABASE_URL = "sqlite:///./lexora.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

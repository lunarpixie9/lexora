from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String, index=True)
    age = Column(Integer, nullable=True)
    role = Column(String, default="student") # 'student', 'teacher', 'parent'
    
    assessments = relationship("Assessment", back_populates="user")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_type = Column(String) # 'written', 'audio'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    overall_score = Column(Integer)
    risk_level = Column(String)
    results_json = Column(Text) # Store the detailed indicator breakdown
    
    user = relationship("User", back_populates="assessments")

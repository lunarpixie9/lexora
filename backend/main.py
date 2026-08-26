import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from passlib.context import CryptContext

import models
from database import engine, get_db, Base
from ml.analyzer import DyslexiaAnalyzer

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lexora API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = DyslexiaAnalyzer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Schemas ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

class WrittenSubmission(BaseModel):
    text: str
    expected_keywords: Optional[List[str]] = []

class AssessmentCreate(BaseModel):
    user_id: int
    task_type: str
    overall_score: int
    risk_level: str
    results_json: str # Stringified JSON

# --- Auth Endpoints ---

@app.post("/api/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        role="student"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=UserResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return db_user

# --- Assessment Endpoints ---

@app.post("/api/assessment/written")
def submit_written_task(submission: WrittenSubmission):
    analysis_result = analyzer.analyze_written_text(
        text=submission.text, 
        expected_keywords=submission.expected_keywords
    )
    return {
        "status": "success",
        "analysis": analysis_result
    }

@app.post("/api/assessments")
def save_assessment(assessment: AssessmentCreate, db: Session = Depends(get_db)):
    db_assessment = models.Assessment(
        user_id=assessment.user_id,
        task_type=assessment.task_type,
        overall_score=assessment.overall_score,
        risk_level=assessment.risk_level,
        results_json=assessment.results_json
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return {"status": "success", "id": db_assessment.id}

@app.get("/api/assessments/{user_id}")
def get_user_assessments(user_id: int, db: Session = Depends(get_db)):
    assessments = db.query(models.Assessment).filter(models.Assessment.user_id == user_id).order_by(models.Assessment.created_at.desc()).all()
    
    # We parse the results_json before returning so frontend gets an object
    results = []
    for a in assessments:
        try:
            parsed_json = json.loads(a.results_json)
        except:
            parsed_json = {}
            
        results.append({
            "id": a.id,
            "task_type": a.task_type,
            "overall_score": a.overall_score,
            "risk_level": a.risk_level,
            "created_at": a.created_at,
            "results_json": parsed_json
        })
    return results

@app.get("/")
def read_root():
    return {"message": "Welcome to Lexora API!"}

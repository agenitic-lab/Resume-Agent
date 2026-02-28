import json
import uuid
import sys
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend to the path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from database.models.run import Run
from database.models.resume import Resume
from database.models.missing_skills import MissingSkillsRun
from database.session import get_db

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=create_engine("sqlite:///backend/resume_analyzer.db"))
db = SessionLocal()

print("Checking Runs (resume_optimization):")
runs = db.query(Run).limit(2).all()
for r in runs:
    print(f"Run {r.id}: {r.original_resume[:20] if r.original_resume else 'None'}...")
    
print("\nChecking Resumes (resume_creation):")
resumes = db.query(Resume).limit(2).all()
for r in resumes:
    print(f"Resume {r.id}: {r.name}, Template: {r.template_name}")

print("\nChecking MissingSkillsRuns (missing_skills_scan):")
scans = db.query(MissingSkillsRun).limit(2).all()
for s in scans:
    print(f"Scan {s.id}: {s.original_resume[:20] if s.original_resume else 'None'}...")
    
db.close()

import sys
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from database.models.resume import Resume
from database.session import get_db

import uuid

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=create_engine("sqlite:///backend/resume_analyzer.db"))
db = SessionLocal()

print("Testing Resume Creation Parse:")
target_uuid = uuid.UUID("f73e247d-852b-43b6-b13e-fd11ce24642a")
resume = db.query(Resume).filter(Resume.id == target_uuid).first()
if not resume:
    print("Resume not found")
else:
    print(f"Name: {resume.name}")
    print(f"Template Name: {resume.template_name}")
    print(f"Job Title: {resume.target_job_title}")
    print(f"Resume Data Type: {type(resume.resume_data)}")
    
    try:
        # Check if it needs to be JSON serialized or if it's already a dict
        data = json.dumps(resume.resume_data)
        print("Successfully dumped resume_data")
    except Exception as e:
        print(f"Failed to dump resume_data: {e}")
        
db.close()

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

engine = create_engine(DATABASE_URL)

create_table_sql = """
CREATE TABLE IF NOT EXISTS resume_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    job_description TEXT NOT NULL,
    original_resume_text TEXT NOT NULL,
    modified_resume_text TEXT,
    ats_score_before FLOAT,
    ats_score_after FLOAT,
    improvement_delta FLOAT,
    status VARCHAR NOT NULL DEFAULT 'pending',
    job_requirements JSONB,
    resume_analysis JSONB,
    improvement_plan JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_resume_runs_user_id ON resume_runs(user_id);
"""

with engine.connect() as conn:
    print("Creating resume_runs table...")
    try:
        conn.execute(text(create_table_sql))
        conn.commit()
        print("Table created successfully")
    except Exception as e:
        print(f"Error creating table: {e}")

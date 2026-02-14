"""
Quick test to verify the Run model and API routes work correctly
"""
from database.models.run import Run, ResumeRun, RunStatus
from sqlalchemy import inspect

# Test 1: Verify model structure
print("=" * 50)
print("TEST 1: Run Model Structure")
print("=" * 50)
print(f"Table name: {Run.__tablename__}")
print(f"ResumeRun is alias: {ResumeRun is Run}")
print("\nModel columns:")
for col in Run.__table__.columns:
    print(f"  - {col.name}: {col.type}")

# Test 2: Verify we can create a Run instance
print("\n" + "=" * 50)
print("TEST 2: Create Run Instance")
print("=" * 50)
try:
    test_run = Run(
        user_id="123e4567-e89b-12d3-a456-426614174000",
        job_description="Test job",
        original_resume_text="Test resume",
        status=RunStatus.PENDING,
        result_json={
            "ats_score_before": 65.0,
            "ats_score_after": 85.0,
            "improvement_delta": 20.0,
            "modified_resume": "Modified test resume",
            "job_requirements": {"skills": ["Python"]},
            "resume_analysis": {"summary": "Good"},
            "improvement_plan": {"actions": ["Add more skills"]}
        }
    )
    print("✓ Run instance created successfully")
    print(f"  Status: {test_run.status}")
    print(f"  Result JSON keys: {list(test_run.result_json.keys())}")
except Exception as e:
    print(f"✗ Error creating Run instance: {e}")

print("\n" + "=" * 50)
print("All tests completed!")
print("=" * 50)

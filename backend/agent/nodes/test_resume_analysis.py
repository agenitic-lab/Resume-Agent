from resume_analysis import analyze_resume
from job_requirements import extract_job_requirements

test_state = {
    "job_description": """
    Senior Python Developer needed.
    Requirements: 5+ years Python, Django, PostgreSQL.
    Experience with AWS preferred.
    """,
    "original_resume": """
    John Doe
    Software Engineer
    
    Skills: Python, Flask, MySQL
    Experience: 3 years building web applications
    """,
    "job_requirements": None
}

# First extract requirements
print("Extracting job requirements...")
result1 = extract_job_requirements(test_state)
test_state.update(result1)

# Then analyze resume
print("\nAnalyzing resume...")
result2 = analyze_resume(test_state)

print("\n=== Analysis Result ===")
print(result2["resume_analysis"])
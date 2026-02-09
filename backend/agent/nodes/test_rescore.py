from rescore import rescore_modified_resume

test_state = {
    "job_requirements": {
        "required_skills": ["Python", "Django", "PostgreSQL"],
        "key_keywords": ["Python", "Django", "PostgreSQL", "Senior Developer"]
    },
    "ats_score_before": {"score": 27.5},
    "original_resume": "John Doe\nSkills: Python\nExperience: 3 years",
    "modified_resume": """
    John Doe
    Senior Software Engineer
    
    Skills: Python, Django, PostgreSQL, AWS
    
    Experience: 5 years building scalable applications
    - Built REST APIs with Django
    - Managed PostgreSQL databases
    """,
    "score_history": []
}

print("Testing rescore node...\n")

result = rescore_modified_resume(test_state)

print(f"Score Before: {test_state['ats_score_before']['score']}")
print(f"Score After: {result['ats_score_after']}")
print(f"Improvement: {result['improvement_delta']}")
print(f"Score History: {result['score_history']}")
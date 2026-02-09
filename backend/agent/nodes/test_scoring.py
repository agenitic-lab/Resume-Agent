from .scoring import score_resume


def test_ats_scoring_basic():
    state = {
        "original_resume": """
        Python Backend Developer

        Experience:
        - Built APIs using FastAPI
        - Worked with PostgreSQL and Docker

        Skills:
        Python, FastAPI, PostgreSQL
        """,
        "job_requirements": {
            "required_skills": ["Python", "FastAPI"],
            "preferred_skills": ["Docker"],
            "key_keywords": ["backend", "api"]
        }
    }

    result = score_resume(state)

    assert "ats_score_before" in result
    score = result["ats_score_before"]["score"]

    assert 0 <= score <= 100

    print("✓ ATS scoring test passed")
    print(result)


if __name__ == "__main__":
    test_ats_scoring_basic()

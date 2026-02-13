from .fit_check import assess_job_fit


def test_fit_check_good_fit():
    state = {
        "original_resume": "Python FastAPI developer with PostgreSQL and REST API experience",
        "job_requirements": {
            "required_skills": ["Python", "FastAPI", "PostgreSQL"],
            "preferred_skills": ["Docker"],
            "key_keywords": ["backend", "api", "postgresql"],
        },
        "decision_log": [],
    }

    result = assess_job_fit(state)
    assert result["fit_decision"] in {"good_fit", "partial_fit"}
    assert result["status"] in {"processing", "rejected_poor_fit"}
    assert len(result["decision_log"]) == 1


def test_fit_check_poor_fit():
    state = {
        "original_resume": "Elementary school teacher with classroom management background",
        "job_requirements": {
            "required_skills": ["Kubernetes", "FastAPI", "PostgreSQL"],
            "preferred_skills": ["AWS"],
            "key_keywords": ["microservices", "backend"],
        },
        "decision_log": [],
    }

    result = assess_job_fit(state)
    assert result["fit_decision"] == "poor_fit"
    assert result["status"] == "rejected_poor_fit"

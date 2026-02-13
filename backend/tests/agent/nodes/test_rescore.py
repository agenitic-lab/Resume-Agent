import sys
from pathlib import Path

try:
    from .rescore import rescore_modified_resume
except ImportError:
    current_dir = Path(__file__).parent
    backend_dir = current_dir.parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    from agent.nodes.rescore import rescore_modified_resume


def test_rescore_node():
    test_state = {
        "job_requirements": {
            "required_skills": ["Python", "Django", "PostgreSQL"],
            "key_keywords": ["Python", "Django", "PostgreSQL", "Senior Developer"],
        },
        "ats_score_before": 27.5,
        "modified_resume": """
        John Doe
        Senior Software Engineer

        Skills: Python, Django, PostgreSQL, AWS

        Experience: 5 years building scalable applications
        - Built REST APIs with Django
        - Managed PostgreSQL databases
        """,
        "score_history": [27.5],
        "iteration_count": 0,
        "decision_log": [],
    }

    result = rescore_modified_resume(test_state)

    assert result["ats_score_after"] is not None
    assert result["improvement_delta"] >= 0
    assert len(result["score_history"]) == 2
    assert result["iteration_count"] == 1


if __name__ == "__main__":
    test_rescore_node()

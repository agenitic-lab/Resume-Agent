import os
from dotenv import load_dotenv
load_dotenv()

from planning import plan_improvements


def test_planning_node():
    state = {
        "job_requirements": {
            "required_skills": ["Python", "Django", "PostgreSQL"],
            "preferred_skills": ["Docker", "AWS"],
            "key_keywords": ["backend", "API", "scalable"]
        },
        "resume_analysis": {
            "current_skills": ["Python", "Flask"],
            "gaps": ["Django", "PostgreSQL"],
            "strengths": ["Backend experience"]
        },
        "ats_score_before": 42,
        "decision_log": []
    }

    result = plan_improvements(state)

    assert "improvement_plan" in result
    plan = result["improvement_plan"]

    print("\n=== Improvement Plan ===")
    print(plan)

    assert isinstance(plan.get("priority_changes"), list)
    assert isinstance(plan.get("expected_score_gain"), (int, float))

    print("\n✓ Planning node test passed!")


if __name__ == "__main__":
    test_planning_node()

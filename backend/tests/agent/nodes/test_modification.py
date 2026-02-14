"""
Tests for Resume Modification Node
"""

from modification import modify_resume


def test_resume_modification():
    state = {
        "original_resume": """
John Doe
Software Engineer

Skills:
Python, Flask

Experience:
Backend Engineer at Startup
Built APIs
""",
        "improvement_plan": {
            "priority_changes": [
                "Emphasize FastAPI experience",
                "Add PostgreSQL keyword"
            ],
            "skill_additions": ["FastAPI", "PostgreSQL"],
            "keyword_insertions": ["REST APIs", "scalable"]
        },
        "decision_log": []
    }

    result = modify_resume(state)

    assert "modified_resume" in result
    assert len(result["modified_resume"]) > len(state["original_resume"])

    print("\n--- MODIFIED RESUME ---\n")
    print(result["modified_resume"])
    print("\n✓ Resume modification test passed!")


if __name__ == "__main__":
    test_resume_modification()

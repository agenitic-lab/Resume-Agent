"""
AG-26: End-to-End Resume Optimization Test

Runs the FULL LangGraph workflow and validates
that the resume improves in a meaningful way.
"""

from agent.workflow import run_optimization


JOB_DESCRIPTION = """
Senior Backend Engineer

Requirements:
- 5+ years Python experience
- Django or FastAPI
- PostgreSQL
- REST API design
- AWS

Nice to have:
- Docker
- CI/CD
"""

ORIGINAL_RESUME = """
Alex Morgan
Backend Developer

Summary:
Backend developer working on web applications.

Experience:
Software Engineer at WebCo (2019–Present)
- Built backend services
- Worked with databases
- Collaborated with frontend teams

Skills:
Python, Flask, MySQL, Git
"""


def test_end_to_end():
    print("\n🚀 Running AG-26 End-to-End Test")
    print("=" * 60)

    result = run_optimization(
        job_description=JOB_DESCRIPTION,
        resume=ORIGINAL_RESUME,
        user_id="ag26-test-user"
    )

    # ---- Workflow completed ----
    assert result["final_status"] == "completed"

    # ---- Scores ----
    before_data = result["ats_score_before"]
    after_data = result["ats_score_after"]

    # Extract score if it's a dictionary
    before = before_data["score"] if isinstance(before_data, dict) else before_data
    after = after_data["score"] if isinstance(after_data, dict) else after_data

    print(f"\nATS Score Before: {before}")
    print(f"ATS Score After:  {after}")

    assert isinstance(before, (int, float))
    assert isinstance(after, (int, float))
    assert after > before, "❌ ATS score did NOT improve"

    # ---- Resume modified ----
    modified = result["modified_resume"]
    assert modified is not None
    assert modified != ORIGINAL_RESUME

    print("\n✓ Resume was modified")

    # ---- Keywords improved ----
    keywords = ["python", "django", "fastapi", "postgresql", "api"]
    found = [k for k in keywords if k in modified.lower()]

    print(f"\nKeywords added: {found}")
    assert len(found) >= 3, "❌ Not enough job keywords added"

    # ---- Improvement plan exists ----
    plan = result.get("improvement_plan")
    assert plan is not None
    assert len(plan.get("priority_changes", [])) > 0

    print("\n✓ Improvement plan created")

    print("\n✅ AG-26 PASSED — End-to-End Agent Works")
    print("=" * 60)


if __name__ == "__main__":
    test_end_to_end()

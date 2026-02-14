"""
AG-24: Simple Workflow Smoke Test
"""

from agent.workflow import run_optimization


JOB_DESC = """
Backend Engineer
Python, Django, PostgreSQL
"""

RESUME = """
Sam Lee
Software Developer

Skills:
Python, Flask

Experience:
Built APIs and worked with databases
"""


def test_workflow_runs():
    print("\n🚀 Running workflow smoke test")

    result = run_optimization(
        job_description=JOB_DESC,
        resume=RESUME,
        user_id="workflow-test"
    )

    assert result["ats_score_before"] is not None
    assert result["ats_score_after"] is not None
    assert result["modified_resume"] is not None

    print("✓ Workflow executed successfully")


if __name__ == "__main__":
    test_workflow_runs()

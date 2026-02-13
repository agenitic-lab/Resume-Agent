from agent.workflow import create_agent_workflow
from agent.state import create_initial_state


def test_full_state_flow():
    print("\n=== STATE FLOW TEST START ===\n")

    app = create_agent_workflow()

    initial_state = create_initial_state(
        user_id = "state-flow-test",
        job_description = """
        senior Python Backend Engineer

        Requirements:
        - Python, FastAPI
        - PostgreSQL
        - Docker
        - REST API
        - 5+ years experience
        """,
        original_resume = """
        Backend Developer

        Experience:
        - Built APIs using Django
        - Worked with PostgreSQL
        - Basic Docker usage

        Skills:
        Python, Django, PostgreSQL        
        """
    )

    final_state = app.invoke(initial_state)

    print("Final state keys:", final_state.keys())

    # ----------------------------
    # 1. State field validation
    # ----------------------------

    required_fields = [
        "job_requirements",
        "resume_analysis",
        "improvement_plan",
        "modified_resume",
        "ats_score_before",
        "ats_score_after",
        "decision_log",
    ]

    for field in required_fields:
        assert field in final_state, f"Missing field in final state: {field}"

    print("✓ All required state fields exist")

    # -------------------------------
    # 5. Validate decision log
    # -------------------------------

    decision_log = final_state["decision_log"]
    assert isinstance(decision_log, list), "decision_log should be a list"
    assert len(decision_log) >= 5, "❌ decision_log should not be empty"

    print(f"✓ decision_log entries: {len(decision_log)}")


    # -------------------------------
    # 6. Validate score improvement
    # -------------------------------


    before_score = float(final_state["ats_score_before"])
    after_score = float(final_state["ats_score_after"])

    print(f"ATS Score Before: {before_score}")
    print(f"ATS Score After: {after_score}")

    assert after_score > before_score, "❌ ATS score did not improve"

    print("✓ ATS score improved")

    print("\n=== AG-25 STATE FLOW TEST PASSED ===\n")

if __name__ == "__main__":
    test_full_state_flow()

import sys
from pathlib import Path

# Support both direct execution and module execution
try:
    from .scoring import score_resume
except ImportError:
    # Running directly - add parent directories to path
    current_dir = Path(__file__).parent
    agent_dir = current_dir.parent
    backend_dir = agent_dir.parent
    
    # Add to sys.path if not already there
    for path in [str(backend_dir), str(agent_dir.parent)]:
        if path not in sys.path:
            sys.path.insert(0, path)
    
    # Import state module first
    from agent.state import ResumeAgentState
    # Now import score_resume with absolute import
    from agent.nodes.scoring import score_resume


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
        },
        "score_history": []
    }

    result = score_resume(state)

    assert "ats_score_before" in result
    score = result["ats_score_before"]["score"]

    assert 0 <= score <= 100

    print("✓ ATS scoring test passed")
    print(result)


if __name__ == "__main__":
    test_ats_scoring_basic()

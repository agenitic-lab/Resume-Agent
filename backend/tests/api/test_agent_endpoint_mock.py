
"""
Test Agent Endpoint (Mock)

Verifies the agent endpoints using a mock workflow.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from database.connection import get_db, Base, engine

def override_get_db():
    try:
        yield MagicMock()
    finally:
        pass

client = TestClient(app)

@pytest.fixture
def test_db():
    """Create test database tables."""
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def auth_headers(test_db):
    """Get auth headers for a test user."""
    return {"Authorization": "Bearer mocked_token"}

@patch("api.routes.agent.decrypt_api_key")
@patch("api.routes.agent.run_optimization")
def test_optimize_resume(mock_run_optimization, mock_decrypt_api_key):
    """Test the optimize endpoint."""

    mock_user = MagicMock()
    mock_user.id = "00000000-0000-0000-0000-000000000000"
    mock_user.encrypted_api_key = "encrypted-value"

    mock_session = MagicMock()

    from auth.dependencies import get_current_user
    from database.connection import get_db

    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session

    try:
        mock_decrypt_api_key.return_value = "gsk_test_key_1234567890"
        mock_run_optimization.return_value = {
            "final_status": "completed",
            "modified_resume": "Optimized Resume Content",
            "ats_score_before": 50.0,
            "ats_score_after": 90.0,
            "improvement_delta": 40.0,
            "ats_breakdown_before": {"keywords": 20.0, "skills": 20.0, "format": 5.0, "sections": 5.0},
            "ats_breakdown_after": {"keywords": 30.0, "skills": 30.0, "format": 15.0, "sections": 15.0},
            "iteration_count": 1,
            "fit_decision": "good_fit",
            "fit_reason": "Strong overlap",
            "fit_confidence": 0.84,
            "job_requirements": {"req1": "must have python"},
            "resume_analysis": {"gap": "missing java"},
            "improvement_plan": {"step1": "add java"},
            "decision_log": [],
        }

        response = client.post(
            "/api/agent/run",
            json={
                "job_description": "A very long job description that meets the minimum length requirement of 50 characters. " * 2,
                "resume": "A very long resume content that meets the minimum length requirement of 100 characters. " * 3
            },
            headers={"Authorization": "Bearer mocked_token"}
        )

        assert response.status_code == 200
        data = response.json()

        assert "run_id" in data
        assert data["modified_resume"] == "Optimized Resume Content"
        assert data["ats_score_before"] == 50.0
        assert data["ats_score_after"] == 90.0
        assert data["fit_decision"] == "good_fit"

        mock_run_optimization.assert_called_once()

    finally:
        app.dependency_overrides = saved_overrides


def test_get_user_runs():
    """Test fetching user runs."""

    mock_user = MagicMock()
    mock_user.id = "00000000-0000-0000-0000-000000000000"
    mock_user.encrypted_api_key = "encrypted-value"

    mock_session = MagicMock()

    from auth.dependencies import get_current_user
    from database.connection import get_db

    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session

    try:
        response = client.get(
            "/api/agent/runs",
            headers={"Authorization": "Bearer mocked_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data == []

    finally:
        app.dependency_overrides = saved_overrides


"""
Test Agent Endpoint (Mock)

Verifies the agent endpoints using a mock workflow.
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.connection import get_db, Base, engine
from database.models import User
from auth.jwt import create_access_token

# Mock dependency
def override_get_db():
    try:
        yield MagicMock()
    finally:
        pass

# Setup client
client = TestClient(app)

@pytest.fixture
def test_db():
    """Create test database tables."""
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup not strictly necessary for in-memory sqlite, but good practice
    # Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers(test_db):
    """Get auth headers for a test user."""
    # Create a user directly in DB (if we were using real DB)
    # But for this test, we might mock the auth dependency or use the real one with a real DB.
    # Given we are using the real DB (sqlite/postgres from connection), let's try to use it.
    
    # Actually, let's mock the auth dependency to avoid DB setup complexity for this unit test
    return {"Authorization": "Bearer mocked_token"}

@patch("api.routes.agent.run_optimization")
def test_optimize_resume(mock_run_optimization):
    """Test the optimize endpoint."""
    
    # Mock user
    mock_user = MagicMock()
    mock_user.id = "00000000-0000-0000-0000-000000000000"
    
    # Mock DB
    mock_session = MagicMock()
    
    # Override dependencies
    from auth.dependencies import get_current_user
    from database.connection import get_db
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        # Mock optimization result
        mock_run_optimization.return_value = {
            "final_status": "completed",
            "modified_resume": "Optimized Resume Content",
            "ats_score_before": 50.0,
            "ats_score_after": 90.0,
            "improvement_delta": 40.0,
            "iteration_count": 1,
            "job_requirements": {"req1": "must have python"},
            "resume_analysis": {"gap": "missing java"},
            "improvement_plan": {"step1": "add java"}
        }
        
        # Test request
        response = client.post(
            "/api/agent/run",
            json={
                "job_description": "A very long job description that meets the minimum length requirement of 50 characters. " * 2,
                "resume": "A very long resume content that meets the minimum length requirement of 100 characters. " * 3
            },
            headers={"Authorization": "Bearer mocked_token"}
        )
        
        # Verify status
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "run_id" in data
        assert data["modified_resume"] == "Optimized Resume Content"
        assert data["ats_score_before"] == 50.0
        assert data["ats_score_after"] == 90.0
        
        # Verify run_optimization was called
        mock_run_optimization.assert_called_once()
        
    finally:
        app.dependency_overrides = {}


def test_get_user_runs():
    """Test fetching user runs."""
    
    # Mock user
    mock_user = MagicMock()
    mock_user.id = "00000000-0000-0000-0000-000000000000"
    
    # Mock DB
    mock_session = MagicMock()
    
    # Override dependencies
    from auth.dependencies import get_current_user
    from database.connection import get_db
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        # Test request
        response = client.get(
            "/api/agent/runs",
            headers={"Authorization": "Bearer mocked_token"}
        )
        
        # Verify status - now returns empty list as DB is not connected
        assert response.status_code == 200
        data = response.json()
        assert data == []
        
    finally:
        app.dependency_overrides = {}

if __name__ == "__main__":
    # Manually run tests if executed directly
    from unittest.mock import MagicMock
    from auth.dependencies import get_current_user
    from database.connection import get_db
    
    print("Running manual tests...")
    
    # Mock user
    mock_user = MagicMock()
    mock_user.id = "00000000-0000-0000-0000-000000000000"
    
    # Mock DB
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None
    mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_session
    
    # Mock run_optimization
    # Since run_optimization is imported in the route, we still need to patch it there
    with patch("api.routes.agent.run_optimization") as mock_run:
        mock_run.return_value = {
            "final_status": "completed",
            "modified_resume": "Optimized Resume Content",
            "ats_score_before": 50.0,
            "ats_score_after": 90.0,
            "improvement_delta": 40.0,
            "iteration_count": 1,
            "modified_resume": "Optimized Resume",
            "job_requirements": {},
            "resume_analysis": {},
            "improvement_plan": {}
        }
        
        print("- Testing /optimize...")
        response = client.post(
            "/api/agent/optimize",
            json={
                "job_description": "A " * 50,
                "resume": "A " * 100
            },
            headers={"Authorization": "Bearer mocked_token"}
        )
        if response.status_code == 200:
            print("  ✓ Success")
        else:
            print(f"  ✗ Failed: {response.status_code} {response.text}")

        print("- Testing /runs...")
        response = client.get(
            "/api/agent/runs",
            headers={"Authorization": "Bearer mocked_token"}
        )
        if response.status_code == 200:
            print("  ✓ Success")
        else:
            print(f"  ✗ Failed: {response.status_code} {response.text}")
            
    # Clear overrides
    app.dependency_overrides = {}

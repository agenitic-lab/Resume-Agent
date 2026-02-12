"""
Auth Middleware Tests

Comprehensive tests for authentication middleware and protected routes.
Tests token validation, error handling, and user retrieval.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from main import app
from database.connection import Base, get_db
from database.models.user import User
from auth.jwt import create_access_token
from core.security import hash_password

# ============================================================================
# Test Database Setup
# ============================================================================

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth_middleware.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# Override the dependency
app.dependency_overrides[get_db] = override_get_db

# Create test client
client = TestClient(app)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create and tear down test database for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user():
    """Create a test user in the database."""
    db = TestingSessionLocal()
    
    user = User(
        email="test@example.com",
        password_hash=hash_password("testpassword123")
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    user_id = str(user.id)
    user_email = user.email
    
    db.close()
    
    return {"id": user_id, "email": user_email}


@pytest.fixture
def valid_token(test_user):
    """Generate a valid JWT token for test user."""
    token, _ = create_access_token(
        user_id=test_user["id"],
        email=test_user["email"]
    )
    return token


# ============================================================================
# Test: Protected Endpoint with Valid Token
# ============================================================================

def test_protected_endpoint_with_valid_token(valid_token):
    """Test accessing protected endpoint with valid JWT token."""
    response = client.get(
        "/api/user/me",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    assert "email" in data
    assert data["email"] == "test@example.com"
    assert "created_at" in data


def test_profile_endpoint_with_valid_token(valid_token):
    """Test accessing profile endpoint with valid JWT token."""
    response = client.get(
        "/api/user/profile",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "user_id" in data
    assert "email" in data
    assert data["email"] == "test@example.com"
    assert "member_since" in data
    assert "resume_optimizations" in data
    assert data["resume_optimizations"] == 0
    assert "account_status" in data
    assert data["account_status"] == "active"


# ============================================================================
# Test: Protected Endpoint without Token
# ============================================================================

def test_protected_endpoint_without_token():
    """Test accessing protected endpoint without authentication token."""
    response = client.get("/api/user/me")
    
    assert response.status_code == 403  # FastAPI HTTPBearer returns 403
    data = response.json()
    assert "detail" in data


def test_profile_endpoint_without_token():
    """Test accessing profile endpoint without token."""
    response = client.get("/api/user/profile")
    
    assert response.status_code == 403


# ============================================================================
# Test: Protected Endpoint with Invalid Token
# ============================================================================

def test_protected_endpoint_with_invalid_token():
    """Test accessing protected endpoint with malformed token."""
    response = client.get(
        "/api/user/me",
        headers={"Authorization": "Bearer invalid-token-here"}
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()


def test_protected_endpoint_with_malformed_header():
    """Test with malformed Authorization header."""
    response = client.get(
        "/api/user/me",
        headers={"Authorization": "NotBearer token"}
    )
    
    assert response.status_code == 403


# ============================================================================
# Test: Token for Non-Existent User
# ============================================================================

def test_token_for_deleted_user():
    """Test token validation when user has been deleted."""
    # Create token for non-existent user
    fake_token, _ = create_access_token(
        user_id="00000000-0000-0000-0000-000000000000",
        email="deleted@example.com"
    )
    
    response = client.get(
        "/api/user/me",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower() or "deleted" in data["detail"].lower()


# ============================================================================
# Test: Optional Authentication
# ============================================================================

def test_optional_auth_with_token(valid_token):
    """Test optional authentication endpoint with valid token."""
    response = client.get(
        "/api/user/status",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["service"] == "Resume Agent API"
    assert data["status"] == "operational"
    assert data["authenticated"] is True
    assert data["user_email"] == "test@example.com"


def test_optional_auth_without_token():
    """Test optional authentication endpoint without token."""
    response = client.get("/api/user/status")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["service"] == "Resume Agent API"
    assert data["status"] == "operational"
    assert data["authenticated"] is False
    assert "user_email" not in data


def test_optional_auth_with_invalid_token():
    """Test optional authentication with invalid token (should not fail)."""
    response = client.get(
        "/api/user/status",
        headers={"Authorization": "Bearer invalid-token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Should treat as anonymous user
    assert data["authenticated"] is False


# ============================================================================
# Test: Multiple Requests with Same Token
# ============================================================================

def test_token_reusability(valid_token):
    """Test that same token can be used for multiple requests."""
    headers = {"Authorization": f"Bearer {valid_token}"}
    
    # First request
    response1 = client.get("/api/user/me", headers=headers)
    assert response1.status_code == 200
    
    # Second request
    response2 = client.get("/api/user/profile", headers=headers)
    assert response2.status_code == 200
    
    # Third request
    response3 = client.get("/api/user/me", headers=headers)
    assert response3.status_code == 200
    
    # All should return same user
    assert response1.json()["email"] == response2.json()["email"]
    assert response1.json()["email"] == response3.json()["email"]


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

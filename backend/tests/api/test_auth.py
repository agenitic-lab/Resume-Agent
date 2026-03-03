"""
Tests for Google OAuth Authentication Endpoint

Tests the /api/auth/google endpoint which handles both sign-in and sign-up via Google OAuth.
Uses mocked Google token verification to avoid external API calls.
"""
import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database.connection import Base, get_db
from database.models.user import User
from schemas.google import GoogleUserInfo

TEST_DB_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

engine_kwargs = {"pool_pre_ping": True}
if TEST_DB_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(TEST_DB_URL, **engine_kwargs)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

MOCK_GOOGLE_USER = GoogleUserInfo(
    google_id="google-123456",
    email="test@gmail.com",
    email_verified=True,
    full_name="Test User",
    profile_picture="https://lh3.googleusercontent.com/photo.jpg"
)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@patch("api.routes.auth.verify_google_token")
def test_google_auth_new_user(mock_verify):
    """New Google user should get an account created and a JWT returned."""
    mock_verify.return_value = MOCK_GOOGLE_USER

    response = client.post("/api/auth/google", json={"credential": "fake-token"})

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@gmail.com"

    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "test@gmail.com").first()
    assert user is not None
    assert user.google_id == "google-123456"
    assert user.auth_provider == "google"
    assert user.password_hash is None
    db.close()


@patch("api.routes.auth.verify_google_token")
def test_google_auth_existing_user(mock_verify):
    """Existing Google user should be logged in without creating a duplicate."""
    mock_verify.return_value = MOCK_GOOGLE_USER

    # First call creates the user
    client.post("/api/auth/google", json={"credential": "fake-token"})

    # Second call should log in the same user
    response = client.post("/api/auth/google", json={"credential": "fake-token"})

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "test@gmail.com"

    db = TestingSessionLocal()
    count = db.query(User).filter(User.email == "test@gmail.com").count()
    assert count == 1
    db.close()


@patch("api.routes.auth.verify_google_token")
def test_google_auth_links_existing_email(mock_verify):
    """If a user exists by email but not Google ID, their account should be linked."""
    db = TestingSessionLocal()
    existing = User(
        email="test@gmail.com",
        auth_provider="google",
        password_hash=None
    )
    db.add(existing)
    db.commit()
    db.refresh(existing)
    existing_id = str(existing.id)
    db.close()

    mock_verify.return_value = MOCK_GOOGLE_USER

    response = client.post("/api/auth/google", json={"credential": "fake-token"})

    assert response.status_code == 200
    assert response.json()["user"]["id"] == existing_id

    db = TestingSessionLocal()
    user = db.query(User).filter(User.id == existing.id).first()
    assert user.google_id == "google-123456"
    assert user.auth_provider == "google"
    db.close()


@patch("api.routes.auth.verify_google_token")
def test_google_auth_updates_profile(mock_verify):
    """Returning user's profile picture and name should be updated if changed."""
    mock_verify.return_value = MOCK_GOOGLE_USER

    # Create user
    client.post("/api/auth/google", json={"credential": "fake-token"})

    # Return with updated profile
    updated_user = GoogleUserInfo(
        google_id="google-123456",
        email="test@gmail.com",
        email_verified=True,
        full_name="Updated Name",
        profile_picture="https://lh3.googleusercontent.com/new-photo.jpg"
    )
    mock_verify.return_value = updated_user

    client.post("/api/auth/google", json={"credential": "fake-token"})

    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "test@gmail.com").first()
    assert user.full_name == "Updated Name"
    assert user.profile_picture == "https://lh3.googleusercontent.com/new-photo.jpg"
    db.close()


@patch("api.routes.auth.verify_google_token")
def test_google_auth_invalid_token(mock_verify):
    """Invalid Google token should return 401."""
    mock_verify.side_effect = ValueError("Invalid Google token")

    response = client.post("/api/auth/google", json={"credential": "bad-token"})

    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_google_auth_missing_credential():
    """Request without credential field should return 422."""
    response = client.post("/api/auth/google", json={})
    assert response.status_code == 422


def test_register_endpoint_removed():
    """The /register endpoint should no longer exist."""
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "Password123!"}
    )
    assert response.status_code == 404 or response.status_code == 405


def test_login_endpoint_removed():
    """The /login endpoint should no longer exist."""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "Password123!"}
    )
    assert response.status_code == 404 or response.status_code == 405


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

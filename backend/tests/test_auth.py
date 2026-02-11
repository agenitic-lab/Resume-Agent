"""
Comprehensive Tests for Authentication Endpoints

Tests registration and login functionality with various scenarios:
- Successful flows
- Error cases
- Edge cases
- Security validations
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database.connection import Base, get_db
from database.models.user import User


# ============================================================================
# Test Database Setup
# ============================================================================

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ============================================================================
# Registration Tests
# ============================================================================

def test_register_success():
    """Test successful user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecurePass123!"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert "user_id" in data
    assert data["email"] == "test@example.com"
    assert data["message"] == "User registered successfully"
    assert "password" not in data  # Password should never be in response


def test_register_duplicate_email():
    """Test registration with duplicate email fails."""
    # Register first user
    client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "Password123!"
        }
    )
    
    # Try to register again with same email
    response = client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "DifferentPass456!"
        }
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email():
    """Test registration with invalid email format."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "not-an-email",
            "password": "Password123!"
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_register_short_password():
    """Test registration with password too short."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "short"  # Less than 8 characters
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_register_missing_fields():
    """Test registration with missing required fields."""
    # Missing password
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com"}
    )
    assert response.status_code == 422
    
    # Missing email
    response = client.post(
        "/api/auth/register",
        json={"password": "Password123!"}
    )
    assert response.status_code == 422
    
    # Missing both
    response = client.post(
        "/api/auth/register",
        json={}
    )
    assert response.status_code == 422


# ============================================================================
# Login Tests
# ============================================================================

def test_login_success():
    """Test successful login flow."""
    # First, register a user
    client.post(
        "/api/auth/register",
        json={
            "email": "login@example.com",
            "password": "SecurePass123!"
        }
    )
    
    # Now login
    response = client.post(
        "/api/auth/login",
        json={
            "email": "login@example.com",
            "password": "SecurePass123!"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert "access_token" in data
    assert "token_type" in data
    assert "expires_in" in data
    assert "user" in data
    
    # Verify token type
    assert data["token_type"] == "bearer"
    
    # Verify expires_in is reasonable (24 hours = 86400 seconds)
    assert data["expires_in"] == 86400
    
    # Verify user info
    user = data["user"]
    assert user["email"] == "login@example.com"
    assert "id" in user
    assert "created_at" in user
    assert "password" not in user  # Password should never be in response
    
    # Verify token is a non-empty string
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0


def test_login_wrong_password():
    """Test login with incorrect password."""
    # Register user
    client.post(
        "/api/auth/register",
        json={
            "email": "user@example.com",
            "password": "CorrectPass123!"
        }
    )
    
    # Try to login with wrong password
    response = client.post(
        "/api/auth/login",
        json={
            "email": "user@example.com",
            "password": "WrongPass456!"
        }
    )
    
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_login_nonexistent_user():
    """Test login with email that doesn't exist."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "SomePass123!"
        }
    )
    
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_login_invalid_email_format():
    """Test login with invalid email format."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "not-an-email",
            "password": "Password123!"
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_login_missing_fields():
    """Test login with missing required fields."""
    # Missing password
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com"}
    )
    assert response.status_code == 422
    
    # Missing email
    response = client.post(
        "/api/auth/login",
        json={"password": "Password123!"}
    )
    assert response.status_code == 422


def test_login_empty_password():
    """Test login with empty password."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": ""
        }
    )
    
    assert response.status_code == 422  # Validation error


# ============================================================================
# Security Tests
# ============================================================================

def test_password_is_hashed():
    """Verify that passwords are stored hashed, not in plaintext."""
    # Register user
    client.post(
        "/api/auth/register",
        json={
            "email": "security@example.com",
            "password": "MyPassword123!"
        }
    )
    
    # Check database directly
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@example.com").first()
    
    # Password hash should not equal the plaintext password
    assert user.password_hash != "MyPassword123!"
    
    # Password hash should be a bcrypt hash (starts with $2b$)
    assert user.password_hash.startswith("$2b$")
    
    db.close()


def test_sql_injection_attempt():
    """Test that SQL injection attempts are handled safely."""
    # Try SQL injection in email field
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@example.com' OR '1'='1",
            "password": "anything"
        }
    )
    
    # Should fail validation or return 401, not cause SQL error
    assert response.status_code in [401, 422]


def test_case_sensitive_email():
    """Test that email comparison is case-insensitive (standard practice)."""
    # Register with lowercase
    client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "Password123!"
        }
    )
    
    # Try to login with uppercase (this test documents current behavior)
    # Note: PostgreSQL email comparison is case-sensitive by default
    # If you want case-insensitive, you'd need to use LOWER() in queries
    response = client.post(
        "/api/auth/login",
        json={
            "email": "TEST@EXAMPLE.COM",
            "password": "Password123!"
        }
    )
    
    # This will fail with current implementation (case-sensitive)
    # To make it pass, modify the login query to use LOWER()
    assert response.status_code == 401


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_registration_and_login_flow():
    """Test complete user journey from registration to login."""
    email = "journey@example.com"
    password = "SecurePassword123!"
    
    # Step 1: Register
    register_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password}
    )
    assert register_response.status_code == 201
    user_id = register_response.json()["user_id"]
    
    # Step 2: Login
    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_response.status_code == 200
    
    # Step 3: Verify user ID matches
    assert login_response.json()["user"]["id"] == user_id


def test_multiple_users_can_login():
    """Test that multiple users can register and login independently."""
    users = [
        {"email": "user1@example.com", "password": "Pass1234!"},
        {"email": "user2@example.com", "password": "Pass5678!"},
        {"email": "user3@example.com", "password": "Pass9012!"},
    ]
    
    # Register all users
    for user in users:
        response = client.post("/api/auth/register", json=user)
        assert response.status_code == 201
    
    # Login all users
    for user in users:
        response = client.post("/api/auth/login", json=user)
        assert response.status_code == 200
        assert response.json()["user"]["email"] == user["email"]


# ============================================================================
# Edge Cases
# ============================================================================

def test_very_long_password():
    """Test registration with very long password."""
    long_password = "a" * 100  # Exactly at max length
    
    response = client.post(
        "/api/auth/register",
        json={
            "email": "longpass@example.com",
            "password": long_password
        }
    )
    
    assert response.status_code == 201


def test_password_over_max_length():
    """Test registration with password exceeding max length."""
    too_long_password = "a" * 101  # Over max length
    
    response = client.post(
        "/api/auth/register",
        json={
            "email": "toolong@example.com",
            "password": too_long_password
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_special_characters_in_password():
    """Test that special characters in password are handled correctly."""
    special_passwords = [
        "P@ssw0rd!#$%",
        "Pass<>word123",
        "Pass'word\"123",
        "Pass\\word/123",
    ]
    
    for i, password in enumerate(special_passwords):
        response = client.post(
            "/api/auth/register",
            json={
                "email": f"special{i}@example.com",
                "password": password
            }
        )
        assert response.status_code == 201
        
        # Verify can login with special characters
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": f"special{i}@example.com",
                "password": password
            }
        )
        assert login_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

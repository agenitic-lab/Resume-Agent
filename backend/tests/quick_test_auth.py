"""
Simple Standalone Test for Login Endpoint

This test verifies the login endpoint works without requiring database setup.
Uses in-memory SQLite database for testing.
"""
import os
import sys

# Set JWT_SECRET before importing anything
os.environ["JWT_SECRET"] = "test-secret-key-for-testing-only"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRY_HOURS"] = "24"

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import after setting environment variables
from main import app
from database.connection import Base, get_db

# Create in-memory test database
engine = create_engine(
    "sqlite:///:memory:",
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

# Create tables
Base.metadata.create_all(bind=engine)

# Create test client
client = TestClient(app)


def main():
    """Run quick validation tests."""
    print("=" * 70)
    print("AUTHENTICATION ENDPOINTS - QUICK VALIDATION")
    print("=" * 70)
    print()
    
    test_email = "quicktest@example.com"
    test_password = "QuickTest123!"
    
    # Test 1: Register user
    print("Test 1: User Registration")
    print("-" * 70)
    response = client.post(
        "/api/auth/register",
        json={"email": test_email, "password": test_password}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 201:
        print("✓ PASS: Registration successful")
    else:
        print("✗ FAIL: Registration failed")
        return
    
    print()
    
    # Test 2: Login
    print("Test 2: User Login")
    print("-" * 70)
    response = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": test_password}
    )
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ PASS: Login successful")
        print(f"  - Token Type: {data.get('token_type')}")
        print(f"  - Expires In: {data.get('expires_in')} seconds")
        print(f"  - User Email: {data.get('user', {}).get('email')}")
        print(f"  - Token Length: {len(data.get('access_token', ''))} characters")
    else:
        print(f"✗ FAIL: Login failed")
        print(f"Response: {response.json()}")
        return
    
    print()
    
    # Test 3: Wrong password
    print("Test 3: Login with Wrong Password")
    print("-" * 70)
    response = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "WrongPassword!"}
    )
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 401:
        print("✓ PASS: Correctly rejected wrong password")
    else:
        print("✗ FAIL: Should have returned 401")
    
    print()
    
    # Test 4: Duplicate registration
    print("Test 4: Duplicate Email Registration")
    print("-" * 70)
    response = client.post(
        "/api/auth/register",
        json={"email": test_email, "password": "Different123!"}
    )
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 400:
        print("✓ PASS: Correctly rejected duplicate email")
    else:
        print("✗ FAIL: Should have returned 400")
    
    print()
    print("=" * 70)
    print("✅ ALL TESTS PASSED!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Start the server: uvicorn main:app --reload --port 8000")
    print("2. Visit API docs: http://localhost:8000/docs")
    print("3. Test with curl (see tests/MANUAL_TESTING.md)")


if __name__ == "__main__":
    main()

"""
Simple manual test to check actual error
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import after path is set
from main import app
from database.connection import Base, get_db
from database.models.user import User
from auth.jwt import create_access_token
from core.security import hash_password

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_manual.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create tables
print("Creating tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")
except Exception as e:
    print(f"✗ Error creating tables: {e}")
    sys.exit(1)

# Create test user
print("\nCreating test user...")
try:
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
    print(f"✓ User created: {user_email} (ID: {user_id})")
except Exception as e:
    print(f"✗ Error creating user: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Create token
print("\nCreating token...")
try:
    token, _ = create_access_token(
        user_id=user_id,
        email=user_email
    )
    print(f"✓ Token created: {token[:50]}...")
except Exception as e:
    print(f"✗ Error creating token: {e}")
    sys.exit(1)

# Test endpoint
print("\nTesting /api/user/me endpoint...")
try:
    client = TestClient(app)
    response = client.get(
        "/api/user/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print(f"✓ Success!")
        print(f"Response: {response.json()}")
    else:
        print(f"✗ Failed!")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"✗ Error during test: {e}")
    import traceback
    traceback.print_exc()

# Cleanup
print("\nCleaning up...")
Base.metadata.drop_all(bind=engine)
print("✓ Done")

"""Debug test to see actual error"""
import sys
import traceback
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database.connection import Base, get_db
from database.models.user import User
from auth.jwt import create_access_token
from core.security import hash_password

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_debug.db"
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
Base.metadata.create_all(bind=engine)

# Create test user
db = TestingSessionLocal()
user = User(
    email="test@example.com",
    password_hash=hash_password("testpassword123")
)
db.add(user)
db.commit()
db.refresh(user)
user_id = str(user.id)
db.close()

# Create token
token, _ = create_access_token(
    user_id=user_id,
    email="test@example.com"
)

# Test
client = TestClient(app)
print(f"Token: {token[:50]}...")
print(f"User ID: {user_id}")

response = client.get(
    "/api/user/me",
    headers={"Authorization": f"Bearer {token}"}
)

print(f"\nStatus Code: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code != 200:
    print("\n=== ERROR DETAILS ===")
    print(response.text)

# Cleanup
Base.metadata.drop_all(bind=engine)

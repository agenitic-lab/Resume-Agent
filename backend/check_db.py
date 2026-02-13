from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in environment")
    exit(1)

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('users')]

required_columns = ['google_id', 'auth_provider', 'profile_picture', 'full_name']
missing = [c for c in required_columns if c not in columns]

if missing:
    print(f"Missing columns: {missing}")
else:
    print("All required columns are present.")

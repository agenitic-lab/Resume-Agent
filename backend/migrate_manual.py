from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print("Migrating users table...")
    
    statements = [
        "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL",
        "ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE",
        "ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'email' NOT NULL",
        "ALTER TABLE users ADD COLUMN profile_picture VARCHAR",
        "ALTER TABLE users ADD COLUMN full_name VARCHAR",
        "CREATE INDEX idx_users_google_id ON users(google_id)"
    ]
    
    for stmt in statements:
        try:
            conn.execute(text(stmt))
            conn.commit()
            print(f"Executed: {stmt}")
        except Exception as e:
            # If column exists, skip but print error
            if "already exists" in str(e):
                print(f"Skipped (exists): {stmt}")
            else:
                print(f"Error executing {stmt}: {e}")
                
    print("Migration finished")

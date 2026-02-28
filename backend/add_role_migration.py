"""
Migration script to add role column to users table
"""
from sqlalchemy import create_engine, text

# Read DATABASE_URL directly from .env file
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            DATABASE_URL = line.strip().split('=', 1)[1]
            break
    else:
        raise RuntimeError("DATABASE_URL not found in .env file")

print(f"Connecting to database...")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        print("\nExecuting: ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user' NOT NULL;")
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user' NOT NULL;"
        ))
        print("Migration executed successfully!")
        
        # Verify
        result = conn.execute(text(
            """SELECT column_name 
               FROM information_schema.columns 
               WHERE table_name='users' AND column_name='role';"""
        ))
        if result.fetchone():
            print("Verified: role column exists in users table.")
        else:
            print("Warning: Could not verify column was added.")
            
except Exception as e:
    print(f"\nMigration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

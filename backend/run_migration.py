"""
Direct migration script - reads .env file directly
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
print(f"Host: {DATABASE_URL.split('@')[1].split(':')[0] if '@' in DATABASE_URL else 'unknown'}")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        print("\nExecuting: ALTER TABLE runs ADD COLUMN IF NOT EXISTS cover_letter TEXT;")
        conn.execute(text(
            "ALTER TABLE runs ADD COLUMN IF NOT EXISTS cover_letter TEXT;"
        ))
        print("✓ Migration executed successfully!")
        
        # Verify
        result = conn.execute(text(
            """SELECT column_name 
               FROM information_schema.columns 
               WHERE table_name='runs' AND column_name='cover_letter';"""
        ))
        if result.fetchone():
            print("✓ Verified: cover_letter column exists in runs table.")
            print("\n✅ Migration complete! You can now run optimizations with cover letter generation.")
        else:
            print("⚠ Warning: Could not verify column was added.")
            
except Exception as e:
    print(f"\n✗ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

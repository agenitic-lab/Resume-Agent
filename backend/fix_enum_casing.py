from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

engine = create_engine(DATABASE_URL)

print("Fixing RunStatus enum values to match Python model...")

with engine.connect() as conn:
    # Start transaction
    trans = conn.begin()
    
    try:
        # First, check current enum values
        result = conn.execute(text("""
            SELECT enumlabel
            FROM pg_enum
            WHERE enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'runstatus'
            )
            ORDER BY enumsortorder;
        """))
        print("\nCurrent enum values:")
        for row in result:
            print(f"  - {row[0]}")
        
        # First, change column to text temporarily
        print("\nConverting status column to TEXT...")
        conn.execute(text("ALTER TABLE runs ALTER COLUMN status TYPE TEXT;"))
        
        # Convert existing uppercase values to lowercase in the runs table
        print("Converting existing run statuses to lowercase...")
        conn.execute(text("""
            UPDATE runs 
            SET status = CASE
                WHEN status = 'PENDING' THEN 'pending'
                WHEN status = 'PROCESSING' THEN 'processing'
                WHEN status = 'COMPLETED' THEN 'completed'
                WHEN status = 'FAILED' THEN 'failed'
                ELSE status
            END;
        """))
        
        # Drop and recreate the enum with correct values
        print("Recreating enum with correct casing...")
        
        # Drop old enum
        conn.execute(text("DROP TYPE IF EXISTS runstatus CASCADE;"))
        
        # Create new enum with correct values
        conn.execute(text("""
            CREATE TYPE runstatus AS ENUM (
                'pending',
                'processing',
                'completed',
                'failed',
                'rejected_poor_fit'
            );
        """))
        
        # Change column back to enum
        conn.execute(text("ALTER TABLE runs ALTER COLUMN status TYPE runstatus USING status::runstatus;"))
        
        # Set default
        conn.execute(text("ALTER TABLE runs ALTER COLUMN status SET DEFAULT 'pending'::runstatus;"))
        
        # Verify
        result = conn.execute(text("""
            SELECT enumlabel
            FROM pg_enum
            WHERE enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'runstatus'
            )
            ORDER BY enumsortorder;
        """))
        print("\nNew enum values:")
        for row in result:
            print(f"  - {row[0]}")
        
        # Check updated data
        result = conn.execute(text("""
            SELECT status, COUNT(*) as count
            FROM runs
            GROUP BY status;
        """))
        print("\nUpdated run statuses:")
        for row in result:
            print(f"  {row[0]}: {row[1]} runs")
        
        trans.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        trans.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise

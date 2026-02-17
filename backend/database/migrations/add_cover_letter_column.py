"""
Migration: Add cover_letter column to runs table

This migration adds a cover_letter TEXT column to the runs table
to store AI-generated cover letters.
"""

def upgrade(connection):
    """Add cover_letter column to runs table."""
    connection.execute("""
        ALTER TABLE runs 
        ADD COLUMN IF NOT EXISTS cover_letter TEXT;
    """)
    print("✓ Added cover_letter column to runs table")


def downgrade(connection):
    """Remove cover_letter column from runs table."""
    connection.execute("""
        ALTER TABLE runs 
        DROP COLUMN IF EXISTS cover_letter;
    """)
    print("✓ Removed cover_letter column from runs table")


if __name__ == "__main__":
    # For manual execution
    from database.connection import get_db_connection
    
    print("Running migration: add_cover_letter_column")
    conn = get_db_connection()
    
    try:
        upgrade(conn)
        conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

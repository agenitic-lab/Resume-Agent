#!/usr/bin/env python
"""Migration script to add is_read column to support_tickets table."""

from sqlalchemy import text, inspect
from database.connection import engine

def add_is_read_column():
    """Add is_read column to support_tickets table."""
    try:
        # Check if column exists
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('support_tickets')]
        
        if 'is_read' in columns:
            print("✓ Column is_read already exists")
            return True
        
        # Add column
        with engine.begin() as conn:
            conn.execute(text('ALTER TABLE support_tickets ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL'))
        
        print("✓ Column is_read added successfully")
        return True
    except Exception as e:
        print(f"✗ Error adding column: {e}")
        return False

if __name__ == "__main__":
    if add_is_read_column():
        print("\n✓ Migration completed successfully")
    else:
        print("\n✗ Migration failed")
        exit(1)

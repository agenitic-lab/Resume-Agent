import os
import sys
import logging
from sqlalchemy import text

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('migration')

def migrate():
    logger.info("Starting manual migration to add 'is_blocked' column...")
    
    with engine.begin() as conn:
        try:
            # Check if column exists first to be safe
            check_sql = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='is_blocked';
            """
            result = conn.execute(text(check_sql)).fetchone()
            
            if result:
                logger.info("Column 'is_blocked' already exists.")
            else:
                logger.info("Adding 'is_blocked' column...")
                conn.execute(text('ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE NOT NULL'))
                logger.info("Successfully added 'is_blocked' column.")
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise e

if __name__ == "__main__":
    migrate()

from database.connection import engine, Base
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='resumes' AND column_name='projects';"
            ))
            if result.fetchone():
                logger.info("Column 'projects' already exists.")
                return

            # Add column
            logger.info("Adding 'projects' column to 'resumes' table...")
            connection.execute(text("ALTER TABLE resumes ADD COLUMN projects JSONB DEFAULT '[]'::jsonb;"))
            connection.commit()
            logger.info("Schema updated successfully.")
            
        except Exception as e:
            logger.error(f"Error updating schema: {e}")
            connection.rollback()

if __name__ == "__main__":
    update_schema()

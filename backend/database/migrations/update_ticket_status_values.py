from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("DATABASE_URL environment variable not set.")

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as connection:
        with connection.begin():
            print("Starting status migration for support_tickets table...")

            # 1. Change the default value of the status column
            print("Step 1: Altering column default to 'unread'.")
            connection.execute(text("ALTER TABLE support_tickets ALTER COLUMN status SET DEFAULT 'unread';"))

            # 2. Update existing 'open' statuses to 'unread'
            print("Step 2: Updating 'open' statuses to 'unread'.")
            update_open = text("UPDATE support_tickets SET status = 'unread' WHERE status = 'open';")
            result_open = connection.execute(update_open)
            print(f"   - {result_open.rowcount} rows updated from 'open' to 'unread'.")

            # 3. Update existing 'in_progress' and 'closed' statuses to 'read'
            print("Step 3: Updating 'in_progress' and 'closed' statuses to 'read'.")
            update_closed = text("UPDATE support_tickets SET status = 'read' WHERE status IN ('in_progress', 'closed');")
            result_closed = connection.execute(update_closed)
            print(f"   - {result_closed.rowcount} rows updated to 'read'.")
            
            print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()

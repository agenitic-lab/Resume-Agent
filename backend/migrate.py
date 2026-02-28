import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
from database.connection import engine
from sqlalchemy import text
with engine.begin() as conn:
    conn.execute(text('ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE NOT NULL'))


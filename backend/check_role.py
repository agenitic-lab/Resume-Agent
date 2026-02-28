import os
from dotenv import load_dotenv
load_dotenv('.env')
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, role FROM users WHERE email = 'testagent@gmail.com'")).fetchone()
    print("USER DATA:", result)

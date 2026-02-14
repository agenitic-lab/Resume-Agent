from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print('Available tables:')
tables = inspector.get_table_names()
for table in tables:
    print(f'  - {table}')

if 'runs' in tables:
    print('\nColumns in runs table:')
    for col in inspector.get_columns('runs'):
        print(f'  - {col["name"]}: {col["type"]}')
        
if 'resume_runs' in tables:
    print('\nColumns in resume_runs table:')
    for col in inspector.get_columns('resume_runs'):
        print(f'  - {col["name"]}: {col["type"]}')

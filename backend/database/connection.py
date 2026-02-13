import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_user_api_key_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("users")}
    statements = []

    if "encrypted_api_key" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN encrypted_api_key TEXT")
    if "api_key_updated_at" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN api_key_updated_at TIMESTAMP WITH TIME ZONE")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def ensure_runtime_schema():
    # Import models lazily to avoid circular import at module load time.
    from database.models.user import User
    from database.models.run import Run

    # Ensure core tables exist (safe with checkfirst behavior).
    Base.metadata.create_all(bind=engine, tables=[User.__table__, Run.__table__])

    # Ensure incremental user columns exist for BYOK.
    ensure_user_api_key_columns()

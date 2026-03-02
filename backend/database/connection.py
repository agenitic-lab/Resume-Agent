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


def ensure_user_template_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("users")}
    statements = []

    if "default_template" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN default_template VARCHAR")
    if "custom_template_latex" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN custom_template_latex TEXT")
    if "custom_templates" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN custom_templates JSONB")
    if "role" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'")
    if "is_blocked" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def ensure_user_oauth_columns():
    """Ensure OAuth-related columns exist (google_id, auth_provider, profile_picture, full_name)."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("users")}
    statements = []

    if "google_id" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE")
    if "auth_provider" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'email' NOT NULL")
    if "profile_picture" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN profile_picture VARCHAR")
    if "full_name" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN full_name VARCHAR")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def ensure_runtime_schema():
    # Import models lazily to avoid circular import at module load time.
    from database.models.user import User
    from database.models.run import Run
    from database.models.missing_skills_run import MissingSkillsRun
    from database.models.resume import Resume, ResumeTemplate

    # Ensure core tables exist (safe with checkfirst behavior).
    Base.metadata.create_all(bind=engine, tables=[
        User.__table__,
        Run.__table__,
        MissingSkillsRun.__table__,
        Resume.__table__,
        ResumeTemplate.__table__,
    ])

    # Ensure incremental user columns exist for BYOK.
    ensure_user_api_key_columns()

    # Ensure template preference columns exist.
    ensure_user_template_columns()

    # Ensure OAuth columns exist (google_id, auth_provider, etc.).
    ensure_user_oauth_columns()

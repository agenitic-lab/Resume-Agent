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
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_timeout=30,
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
    if "is_test_user" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN is_test_user BOOLEAN DEFAULT FALSE")

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
        statements.append("ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'google' NOT NULL")
    if "profile_picture" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN profile_picture VARCHAR")
    if "full_name" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN full_name VARCHAR")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def ensure_role_column_defaults():
    """Add server-side DEFAULT to role and is_blocked columns if missing.

    The original create_all() only set Python-side defaults, leaving no
    protection at the database level.  This ensures the DB itself enforces
    'user' as the default role so that no code-path can accidentally leave
    the column empty.
    """
    try:
        with engine.begin() as conn:
            # Add server-side DEFAULT 'user' for the role column
            conn.execute(text(
                "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'"
            ))
            # Add server-side DEFAULT false for is_blocked
            conn.execute(text(
                "ALTER TABLE users ALTER COLUMN is_blocked SET DEFAULT false"
            ))
            # Fix any NULL roles that might exist
            conn.execute(text(
                "UPDATE users SET role = 'user' WHERE role IS NULL"
            ))
            # Fix any NULL is_blocked that might exist
            conn.execute(text(
                "UPDATE users SET is_blocked = false WHERE is_blocked IS NULL"
            ))
    except Exception:
        # Column or table may not exist yet on first run; safe to ignore
        pass


def ensure_support_ticket_columns():
    """Ensure support_tickets columns exist (is_read for read/unread feature, is_replied for reply tracking)."""
    inspector = inspect(engine)
    if "support_tickets" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("support_tickets")}
    statements = []

    if "is_read" not in existing:
        statements.append("ALTER TABLE support_tickets ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL")
    if "is_replied" not in existing:
        statements.append("ALTER TABLE support_tickets ADD COLUMN is_replied BOOLEAN DEFAULT FALSE NOT NULL")

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
    from database.models.support import SupportTicket
    from database.models.system_setting import SystemSetting

    # Ensure core tables exist (safe with checkfirst behavior).
    Base.metadata.create_all(bind=engine, tables=[
        User.__table__,
        Run.__table__,
        MissingSkillsRun.__table__,
        Resume.__table__,
        ResumeTemplate.__table__,
        SupportTicket.__table__,
        SystemSetting.__table__,
    ])

    # Ensure incremental user columns exist for BYOK.
    ensure_user_api_key_columns()

    # Ensure template preference columns exist.
    ensure_user_template_columns()

    # Ensure OAuth columns exist (google_id, auth_provider, etc.).
    ensure_user_oauth_columns()

    # Ensure role and is_blocked have server-side defaults.
    ensure_role_column_defaults()

    # Ensure support ticket columns exist.
    ensure_support_ticket_columns()

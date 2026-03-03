import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
    role = Column(String, default="user", nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    
    # API key storage (encrypted)
    encrypted_api_key = Column(Text, nullable=True)
    api_key_updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(String, default='google', nullable=False)
    profile_picture = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    
    # Template preferences
    default_template = Column(String, nullable=True, default=None)  # builtin ID or 'custom_0','custom_1','custom_2'
    custom_template_latex = Column(Text, nullable=True)  # legacy single custom template
    custom_templates = Column(JSONB, nullable=True, default=None)  # list of up to 3 custom templates [{name, latex}]

    created_at = Column(DateTime(timezone=True), server_default=func.now())

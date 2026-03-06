import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from database.connection import Base


class SystemSetting(Base):
    """Key-value store for system-wide settings.

    Stores admin templates, default template, deleted templates list,
    maintenance mode, and other configuration in the database so that
    settings survive container redeployments (unlike local JSON files).
    """
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(JSONB, nullable=False, default={})
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

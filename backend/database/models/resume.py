from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from database.connection import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String, nullable=False)
    experience_level = Column(String)
    contact = Column(JSONB, nullable=False)
    experience = Column(JSONB, nullable=False)
    education = Column(JSONB, nullable=False)
    projects = Column(JSONB, nullable=True, default=[])
    skills = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ResumeTemplate(Base):
    __tablename__ = "resume_templates"

    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    template_file = Column(String, nullable=False)
    preview_image = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True))

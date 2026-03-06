import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class MissingSkillsRun(Base):
    __tablename__ = "missing_skills_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Display info
    resume_snippet = Column(Text, nullable=True)       # first ~200 chars
    jds_count = Column(Integer, nullable=False)         # JDs submitted
    jds_analyzed = Column(Integer, nullable=False)      # JDs successfully analyzed
    total_missing = Column(Integer, nullable=False)     # total missing skills found

    # Full result payload
    result_json = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="missing_skills_runs")

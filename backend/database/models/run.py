import uuid
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database.connection import Base

class ResumeRun(Base):
    __tablename__ = "resume_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Input Data
    job_description = Column(Text, nullable=False)
    original_resume_text = Column(Text, nullable=False)
    
    # Output Data
    modified_resume_text = Column(Text, nullable=True)
    
    # Scores
    ats_score_before = Column(Float, nullable=True)
    ats_score_after = Column(Float, nullable=True)
    improvement_delta = Column(Float, nullable=True)
    
    # Status
    status = Column(String, default="pending", nullable=False) # pending, completed, failed
    
    # Structured Data (stored as JSON)
    job_requirements = Column(JSONB, nullable=True)
    resume_analysis = Column(JSONB, nullable=True)
    improvement_plan = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("database.models.user.User", backref="resume_runs")

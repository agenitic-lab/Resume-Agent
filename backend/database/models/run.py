import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED_POOR_FIT = "rejected_poor_fit"


class Run(Base):
    __tablename__ = "runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status = Column(Enum(RunStatus, values_callable=lambda x: [e.value for e in x]), default=RunStatus.PENDING, nullable=False)

    # Inputs
    job_description = Column(Text, nullable=True)
    original_resume_text = Column(Text, nullable=True)
    resume_file_path = Column(String, nullable=True)

    # Outputs
    optimized_resume_path = Column(String, nullable=True)
    result_json = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="runs")


# Backward compatible alias if any older code still imports ResumeRun.
ResumeRun = Run

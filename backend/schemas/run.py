from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field

from database.models.run import RunStatus

class RunBase(BaseModel):
    """Base schema for Run"""
    job_description: Optional[str] = None
    status: RunStatus = RunStatus.PENDING

class RunCreate(RunBase):
    """Schema for creating a run (internal use)"""
    user_id: UUID
    resume_file_path: str
    original_resume_text: Optional[str] = None

class RunResponse(RunBase):
    """Schema for run response"""
    id: UUID
    user_id: UUID
    original_resume_text: Optional[str] = None
    resume_file_path: Optional[str] = None
    optimized_resume_path: Optional[str] = None
    result_json: Optional[Any] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RunUpdate(BaseModel):
    """Schema for updating a run"""
    status: Optional[RunStatus] = None
    optimized_resume_path: Optional[str] = None
    result_json: Optional[Any] = None

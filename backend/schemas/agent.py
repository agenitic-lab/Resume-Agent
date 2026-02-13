
"""
Agent API Schemas

Pydantic models for agent endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class OptimizeRequest(BaseModel):
    """Request to optimize a resume."""
    job_description: str = Field(..., min_length=50)
    resume: str = Field(..., min_length=100)


class OptimizeResponse(BaseModel):
    """Response from optimization."""
    run_id: str
    user_id: str
    
    # Inputs
    job_description: str
    original_resume: str
    
    # Outputs
    modified_resume: str
    
    # Scores
    ats_score_before: float
    ats_score_after: float
    improvement_delta: float
    
    # Agent details
    iteration_count: int
    final_status: str
    
    # Structured data
    job_requirements: Optional[Dict[str, Any]] = None
    resume_analysis: Optional[Dict[str, Any]] = None
    improvement_plan: Optional[Dict[str, Any]] = None


class RunStatusResponse(BaseModel):
    """Status of an optimization run."""
    run_id: str
    status: str
    created_at: str
    completed_at: Optional[str] = None


class RunListItem(BaseModel):
    """Summary of a run for list view."""
    id: str
    created_at: Any
    job_description: str
    ats_score_before: Optional[float] = None
    ats_score_after: Optional[float] = None
    improvement_delta: Optional[float] = None
    status: str


class RunDetailResponse(OptimizeResponse):
    """Full detail of a run (same fields as optimize response)."""
    id: str
    created_at: Any
    completed_at: Optional[Any] = None

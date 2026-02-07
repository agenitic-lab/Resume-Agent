from typing import TypedDict, Optional
from datetime import datetime


class ResumeAgentState(TypedDict):
    user_id: str
    job_description: str
    original_resume: str
    modified_resume: Optional[str]
    cover_letter: Optional[str]
    
    ats_score_before: Optional[float]
    ats_score_after: Optional[float]
    
    job_requirements: Optional[dict]
    resume_analysis: Optional[dict]
    improvement_plan: Optional[dict]
    decision_log: Optional[list]
    score_history: Optional[list]
    
    iteration_count: int
    max_iterations: int
    status: str
    created_at: str


def create_initial_state(user_id: str, job_description: str, original_resume: str) -> ResumeAgentState:
    return {
        "user_id": user_id,
        "job_description": job_description,
        "original_resume": original_resume,
        "modified_resume": None,
        "cover_letter": None,
        "ats_score_before": None,
        "ats_score_after": None,
        "job_requirements": None,
        "resume_analysis": None,
        "improvement_plan": None,
        "decision_log": [],
        "score_history": [],
        "iteration_count": 0,
        "max_iterations": 3,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
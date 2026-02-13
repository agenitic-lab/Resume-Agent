from typing import TypedDict, Optional
from datetime import datetime
from config import settings


class ResumeAgentState(TypedDict):
    user_id: str
    user_llm_api_key: Optional[str]
    job_description: str
    original_resume: str
    modified_resume: Optional[str]
    cover_letter: Optional[str]
    
    ats_score_before: Optional[float]
    ats_score_after: Optional[float]
    ats_breakdown_before: Optional[dict]
    ats_breakdown_after: Optional[dict]
    improvement_delta: Optional[float]
    last_iteration_delta: Optional[float]

    job_requirements: Optional[dict]
    resume_analysis: Optional[dict]
    improvement_plan: Optional[dict]
    decision_log: Optional[list]
    score_history: Optional[list]
    fit_decision: str
    fit_reason: Optional[str]
    fit_confidence: Optional[float]

    iteration_count: int
    max_iterations: int
    target_score: float
    min_iteration_gain: float
    status: str
    created_at: str


def create_initial_state(
    user_id: str,
    job_description: str,
    original_resume: str,
    user_llm_api_key: Optional[str] = None,
) -> ResumeAgentState:
    return {
        "user_id": user_id,
        "user_llm_api_key": user_llm_api_key,
        "job_description": job_description,
        "original_resume": original_resume,
        "modified_resume": None,
        "cover_letter": None,
        "ats_score_before": None,
        "ats_score_after": None,
        "ats_breakdown_before": None,
        "ats_breakdown_after": None,
        "improvement_delta": None,
        "last_iteration_delta": None,
        "job_requirements": None,
        "resume_analysis": None,
        "improvement_plan": None,
        "decision_log": [],
        "score_history": [],
        "fit_decision": "unknown",
        "fit_reason": None,
        "fit_confidence": None,
        "iteration_count": 0,
        "max_iterations": settings.MAX_ITERATIONS,
        "target_score": settings.TARGET_SCORE,
        "min_iteration_gain": settings.MIN_ITERATION_GAIN,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

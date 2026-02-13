
"""
Agent Routes

Resume optimization endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
import sys
import os

from database.connection import get_db
from database.models import User
from auth.dependencies import get_current_user
from schemas.agent import OptimizeRequest, OptimizeResponse
from core.security import decrypt_api_key

from typing import List
from sqlalchemy import desc
from database.models.run import ResumeRun
from schemas.agent import OptimizeRequest, OptimizeResponse, RunListItem, RunDetailResponse

# Import agent workflow
# Adjust path to import from agent directory
current_dir = os.path.dirname(os.path.abspath(__file__))
agent_dir = os.path.abspath(os.path.join(current_dir, "../../agent"))
if agent_dir not in sys.path:
    sys.path.append(agent_dir)

try:
    from workflow import run_optimization
except ImportError:
    # Fallback for testing/development if workflow not found
    print("Warning: Could not import run_optimization from workflow")
    def run_optimization(**kwargs):
        raise NotImplementedError("Workflow module not available")

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/run", response_model=OptimizeResponse)
def run_agent_workflow(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Optimize a resume for a job description.
    
    Runs the LangGraph agent workflow and returns optimized results.
    Protected endpoint - requires authentication.
    """
    # Check if user has set their API key
    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set your API key in Settings before running optimization.",
        )

    try:
        user_llm_api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored API key is invalid. Please set your API key again in Settings.",
        )

    try:
        # Generate run ID
        run_id = f"run-{uuid.uuid4()}"
        
        print(f"Starting optimization run: {run_id} for user {current_user.id}")
        
        # Run the agent workflow
        result = run_optimization(
            job_description=request.job_description,
            resume=request.resume,
            user_id=str(current_user.id),
            user_llm_api_key=user_llm_api_key,
            run_id=run_id
        )
        
        print(f"Agent completed: {result['final_status']}")
        
        # Save to database (AG-37)
        db_run = ResumeRun(
            user_id=current_user.id,
            job_description=request.job_description,
            original_resume_text=request.resume,
            
            # Outputs
            modified_resume_text=result.get("modified_resume"),
            
            # Scores
            ats_score_before=result.get("ats_score_before"),
            ats_score_after=result.get("ats_score_after"),
            improvement_delta=result.get("improvement_delta"),
            
            # Status
            status=result.get("final_status", "completed"),
            completed_at=datetime.now(),
            
            # Structured Data
            job_requirements=result.get("job_requirements"),
            resume_analysis=result.get("resume_analysis"),
            improvement_plan=result.get("improvement_plan")
        )
        
        db.add(db_run)
        db.commit()
        db.refresh(db_run)
        
        # Return response
        return OptimizeResponse(
            run_id=str(db_run.id),
            user_id=str(current_user.id),
            job_description=request.job_description,
            original_resume=request.resume,
            modified_resume=result["modified_resume"],
            ats_score_before=result["ats_score_before"],
            ats_score_after=result["ats_score_after"],
            improvement_delta=result["improvement_delta"],
            iteration_count=result["iteration_count"],
            final_status=result["final_status"],
            job_requirements=result.get("job_requirements"),
            resume_analysis=result.get("resume_analysis"),
            improvement_plan=result.get("improvement_plan")
        )
        
    except Exception as e:
        # Log error and return user-friendly message
        print(f"Agent error: {str(e)}")
        # In a real app, we might want to log this to Sentry or similar
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}"
        )


@router.get("/runs/{run_id}", response_model=RunDetailResponse)
def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific optimization run.
    """
    run = db.query(ResumeRun).filter(ResumeRun.id == run_id).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found"
        )
        
    # Check ownership
    if str(run.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this run"
        )
        
    return RunDetailResponse(
        id=str(run.id),
        run_id=str(run.id),
        user_id=str(run.user_id),
        created_at=run.created_at,
        completed_at=run.completed_at,
        
        job_description=run.job_description,
        original_resume=run.original_resume_text,
        modified_resume=run.modified_resume_text or "",
        
        ats_score_before=run.ats_score_before or 0.0,
        ats_score_after=run.ats_score_after or 0.0,
        improvement_delta=run.improvement_delta or 0.0,
        
        iteration_count=0, # Not persisted currently
        final_status=run.status,
        
        job_requirements=run.job_requirements,
        resume_analysis=run.resume_analysis,
        improvement_plan=run.improvement_plan
    )


@router.get("/runs", response_model=List[RunListItem])
def get_user_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    skip: int = 0
):
    """
    Get user's optimization run history.
    """
    runs = db.query(ResumeRun)\
        .filter(ResumeRun.user_id == current_user.id)\
        .order_by(desc(ResumeRun.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()
        
    return [
        RunListItem(
            id=str(run.id),
            created_at=run.created_at,
            job_description=run.job_description[:100] + "..." if len(run.job_description) > 100 else run.job_description,
            ats_score_before=run.ats_score_before,
            ats_score_after=run.ats_score_after,
            improvement_delta=run.improvement_delta,
            status=run.status
        )
        for run in runs
    ]

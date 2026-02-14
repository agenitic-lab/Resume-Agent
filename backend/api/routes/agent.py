
# Resume optimization API endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import uuid
from datetime import datetime

from database.connection import get_db
from database.models import User
from database.models.run import ResumeRun
from auth.dependencies import get_current_user
from schemas.agent import OptimizeRequest, OptimizeResponse, RunListItem, RunDetailResponse
from core.security import decrypt_api_key

# Import agent workflow using proper package path
try:
    from agent.workflow import run_optimization
except ImportError as e:
    # Fallback for testing/development if workflow not found
    print(f"Warning: Could not import run_optimization from agent.workflow: {e}")
    def run_optimization(**kwargs):
        raise NotImplementedError("Workflow module not available")

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/run", response_model=OptimizeResponse)
def run_agent_workflow(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Run agent optimization workflow
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
        # Store all results in result_json JSONB field
        db_run = ResumeRun(
            user_id=current_user.id,
            job_description=request.job_description,
            original_resume_text=request.resume,
            status=result.get("final_status", "completed"),
            result_json=result  # Store the entire result in JSONB
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
            modified_resume=result.get("modified_resume"),
            ats_score_before=result.get("ats_score_before", 0.0),
            ats_score_after=result.get("ats_score_after"),
            improvement_delta=result.get("improvement_delta"),
            ats_breakdown_before=result.get("ats_breakdown_before"),
            ats_breakdown_after=result.get("ats_breakdown_after"),
            iteration_count=result.get("iteration_count", 0),
            final_status=result.get("final_status", "completed"),
            fit_decision=result.get("fit_decision", "unknown"),
            fit_reason=result.get("fit_reason"),
            fit_confidence=result.get("fit_confidence"),
            job_requirements=result.get("job_requirements"),
            resume_analysis=result.get("resume_analysis"),
            improvement_plan=result.get("improvement_plan"),
            decision_log=result.get("decision_log")
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
    # Get single run by ID
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
    
    # Extract data from result_json
    result_json = run.result_json or {}
    ats_score_before = result_json.get("ats_score_before", 0.0)
    ats_score_after = result_json.get("ats_score_after", 0.0)
    improvement_delta = result_json.get("improvement_delta", 0.0)
    modified_resume = result_json.get("modified_resume", "")
    job_requirements = result_json.get("job_requirements")
    resume_analysis = result_json.get("resume_analysis")
    improvement_plan = result_json.get("improvement_plan")
    
    # Convert enum to string value if needed
    final_status = run.status.value if hasattr(run.status, 'value') else str(run.status)
        
    return RunDetailResponse(
        id=str(run.id),
        run_id=str(run.id),
        user_id=str(run.user_id),
        created_at=run.created_at,
        completed_at=run.updated_at,
        
        job_description=run.job_description,
        original_resume=run.original_resume_text,
        modified_resume=modified_resume,
        
        ats_score_before=ats_score_before,
        ats_score_after=ats_score_after,
        improvement_delta=improvement_delta,
        ats_breakdown_before=result_json.get("ats_breakdown_before"),
        ats_breakdown_after=result_json.get("ats_breakdown_after"),
        
        iteration_count=result_json.get("iteration_count", 0),
        final_status=final_status,
        fit_decision=result_json.get("fit_decision", "unknown"),
        fit_reason=result_json.get("fit_reason"),
        fit_confidence=result_json.get("fit_confidence"),
        
        job_requirements=job_requirements,
        resume_analysis=resume_analysis,
        improvement_plan=improvement_plan,
        decision_log=result_json.get("decision_log"),
        score_history=result_json.get("score_history"),
        cover_letter=result_json.get("cover_letter")
    )


@router.get("/runs", response_model=List[RunListItem])
def get_user_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    skip: int = 0
):
    # Get user's run history with pagination
    runs = db.query(ResumeRun)\
        .filter(ResumeRun.user_id == current_user.id)\
        .order_by(desc(ResumeRun.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()
        
    result_list = []
    for run in runs:
        # Extract scores from result_json if available
        result_json = run.result_json or {}
        ats_score_before = result_json.get("ats_score_before")
        ats_score_after = result_json.get("ats_score_after")
        
        # Calculate improvement delta if both scores are available
        improvement_delta = None
        if ats_score_before is not None and ats_score_after is not None:
            improvement_delta = ats_score_after - ats_score_before
        
        # Truncate job description safely
        job_desc = run.job_description or ""
        truncated_job_desc = job_desc[:100] + "..." if len(job_desc) > 100 else job_desc
        
        result_list.append(
            RunListItem(
                id=str(run.id),
                created_at=run.created_at,
                job_description=truncated_job_desc,
                ats_score_before=ats_score_before,
                ats_score_after=ats_score_after,
                improvement_delta=improvement_delta,
                status=run.status.value if hasattr(run.status, 'value') else str(run.status)
            )
        )
    
    return result_list


@router.delete("/runs/{run_id}")
def delete_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Delete a specific run by ID
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
            detail="Not authorized to delete this run"
        )
    
    # Delete the run
    db.delete(run)
    db.commit()
    
    return {"message": "Run deleted successfully"}

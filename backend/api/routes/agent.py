
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
    try:
        # Generate run ID
        run_id = f"run-{uuid.uuid4()}"
        
        print(f"Starting optimization run: {run_id} for user {current_user.id}")
        
        # Run the agent workflow
        result = run_optimization(
            job_description=request.job_description,
            resume=request.resume,
            user_id=str(current_user.id),
            run_id=run_id
        )
        
        print(f"Agent completed: {result['final_status']}")
        
        # NOTE: Database persistence (AG-37/AG-38) disabled as per user request.
        # Results are returned directly without saving to agent_runs table.
        
        # Return response
        return OptimizeResponse(
            run_id=run_id,
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


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific optimization run.
    """
    # AG-37 (Database Model) is pending, so we cannot fetch runs yet.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Run history not yet implemented (requires AG-37)"
    )


@router.get("/runs")
def get_user_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """
    Get user's optimization run history.
    """
    # AG-37 (Database Model) is pending, so we cannot fetch runs yet.
    return []

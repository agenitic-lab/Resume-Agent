
# Agent optimization endpoints
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
import logging
import json
import asyncio
from datetime import datetime, timezone

from database.connection import get_db
from database.models import User, Run, RunStatus
from auth.dependencies import get_current_user
from schemas.agent import OptimizeRequest, OptimizeResponse
from agent.workflow import run_optimization, run_optimization_with_events
from core.security import decrypt_api_key

router = APIRouter(prefix="/api/agent", tags=["agent"])
logger = logging.getLogger(__name__)


def _extract_run_metrics(run: Run) -> dict:
    raw_result = run.result_json
    if isinstance(raw_result, dict):
        result = raw_result
    elif isinstance(raw_result, str):
        try:
            parsed = json.loads(raw_result)
            result = parsed if isinstance(parsed, dict) else {}
        except Exception:
            result = {}
    else:
        result = {}

    before = result.get("ats_score_before")
    after = result.get("ats_score_after")
    delta = result.get("improvement_delta")
    return {
        "run_id": str(run.id),
        "status": run.status.value if hasattr(run.status, "value") else str(run.status),
        "job_description": run.job_description,
        "ats_score_before": before,
        "ats_score_after": after,
        "improvement_delta": delta,
        "iteration_count": result.get("iteration_count", 0),
        "fit_decision": result.get("fit_decision", "unknown"),
        "fit_reason": result.get("fit_reason"),
        "final_status": result.get("final_status") or result.get("status"),
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "updated_at": run.updated_at.isoformat() if run.updated_at else None,
    }


@router.post("/run", response_model=OptimizeResponse)
@router.post("/optimize", response_model=OptimizeResponse)
def run_agent_workflow(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Run the agent to optimize resume for the job
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

    db_run = Run(
        user_id=current_user.id,
        status=RunStatus.PROCESSING,
        job_description=request.job_description,
        original_resume_text=request.resume,
    )
    db.add(db_run)
    db.flush()
    run_id = str(db_run.id)
    db.commit()

    try:
        logger.info("Starting optimization run %s for user %s", run_id, current_user.id)
        result = run_optimization(
            job_description=request.job_description,
            resume=request.resume,
            user_id=str(current_user.id),
            user_llm_api_key=user_llm_api_key,
            run_id=run_id
        )

        logger.info("Agent completed run %s with status %s", run_id, result.get("final_status"))

        db_run.status = RunStatus.COMPLETED
        db_run.result_json = result
        db_run.optimized_resume_path = None
        db.commit()

        return OptimizeResponse(
            run_id=run_id,
            user_id=str(current_user.id),
            job_description=request.job_description,
            original_resume=request.resume,
            modified_resume=result.get("modified_resume"),
            ats_score_before=float(result.get("ats_score_before") or 0.0),
            ats_score_after=result.get("ats_score_after"),
            improvement_delta=result.get("improvement_delta"),
            ats_breakdown_before=result.get("ats_breakdown_before"),
            ats_breakdown_after=result.get("ats_breakdown_after"),
            iteration_count=int(result.get("iteration_count", 0)),
            final_status=result["final_status"],
            fit_decision=result.get("fit_decision", "unknown"),
            fit_reason=result.get("fit_reason"),
            fit_confidence=result.get("fit_confidence"),
            job_requirements=result.get("job_requirements"),
            resume_analysis=result.get("resume_analysis"),
            improvement_plan=result.get("improvement_plan"),
            decision_log=result.get("decision_log"),
        )

    except Exception as e:
        logger.exception("Agent failed for run %s", run_id)
        try:
            db_run.status = RunStatus.FAILED
            db_run.result_json = {"error": str(e)}
            db.commit()
        except SQLAlchemyError:
            db.rollback()

        lower = str(e).lower()
        if "429" in lower or "rate limit" in lower or "quota" in lower:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Your API key has hit a rate/quota limit. Update key or retry later.",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}"
        )


@router.post("/run/stream")
async def run_agent_workflow_stream(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream optimization progress events (SSE) from backend workflow execution.
    """
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

    db_run = Run(
        user_id=current_user.id,
        status=RunStatus.PROCESSING,
        job_description=request.job_description,
        original_resume_text=request.resume,
    )
    db.add(db_run)
    db.flush()
    run_id = str(db_run.id)
    db.commit()

    queue: asyncio.Queue[dict] = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(event: str, data: dict):
        payload = {
            "event": event,
            "data": {
                **(data or {}),
                "run_id": run_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }
        loop.call_soon_threadsafe(queue.put_nowait, payload)

    async def run_and_finalize():
        try:
            logger.info("Starting streaming optimization run %s for user %s", run_id, current_user.id)
            result = await asyncio.to_thread(
                run_optimization_with_events,
                request.job_description,
                request.resume,
                str(current_user.id),
                user_llm_api_key,
                run_id,
                emit,
            )

            db_run.status = RunStatus.COMPLETED
            db_run.result_json = result
            db_run.optimized_resume_path = None
            db.commit()

            await queue.put(
                {
                    "event": "completed",
                    "data": {
                        "run_id": run_id,
                        "result": result,
                        "status": "completed",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                }
            )
        except Exception as exc:
            logger.exception("Streaming agent failed for run %s", run_id)
            try:
                db_run.status = RunStatus.FAILED
                db_run.result_json = {"error": str(exc)}
                db.commit()
            except SQLAlchemyError:
                db.rollback()

            message = str(exc)
            await queue.put(
                {
                    "event": "error",
                    "data": {
                        "run_id": run_id,
                        "message": message,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                }
            )
        finally:
            await queue.put(
                {
                    "event": "end",
                    "data": {
                        "run_id": run_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                }
            )

    task = asyncio.create_task(run_and_finalize())

    async def event_generator():
        try:
            while True:
                payload = await queue.get()
                yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"
                if payload["event"] == "end":
                    break
        finally:
            await task

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific optimization run.
    """
    try:
        run_uuid = UUID(run_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid run_id format"
        )

    try:
        run = (
            db.query(Run)
            .filter(Run.id == run_uuid, Run.user_id == current_user.id)
            .first()
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch run %s for user %s: %s", run_id, current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load run details.",
        )

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found"
        )

    try:
        return {
            **_extract_run_metrics(run),
            "original_resume_text": run.original_resume_text,
            "result_json": run.result_json,
        }
    except Exception as exc:
        logger.exception("Failed to serialize run %s: %s", run_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serialize run details.",
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
    try:
        runs = (
            db.query(Run)
            .filter(Run.user_id == current_user.id)
            .order_by(Run.created_at.desc())
            .limit(limit)
            .all()
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch runs for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load run history.",
        )

    try:
        return [_extract_run_metrics(run) for run in runs]
    except Exception as exc:
        logger.exception("Failed to serialize run history for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serialize run history.",
        )


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a single optimization run from user history.
    """
    try:
        run_uuid = UUID(run_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid run_id format",
        )

    try:
        run = (
            db.query(Run)
            .filter(Run.id == run_uuid, Run.user_id == current_user.id)
            .first()
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to load run %s for deletion: %s", run_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load run for deletion.",
        )

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found",
        )

    try:
        db.delete(run)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to delete run %s: %s", run_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete run.",
        )


@router.delete("/runs")
def delete_all_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete all optimization runs for the current user.
    """
    try:
        deleted_count = (
            db.query(Run)
            .filter(Run.user_id == current_user.id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return {"deleted": deleted_count}
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to clear run history for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear run history.",
        )

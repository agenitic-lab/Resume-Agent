from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.workflow import run_optimization
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter(prefix="/api/agent", tags=["agent"])


class OptimizeRequest(BaseModel):
    job_description: str
    resume_text: str
    user_id: str = "anonymous"


class OptimizeResponse(BaseModel):
    modified_resume: str
    ats_score_before: float | None
    ats_score_after: float | None
    status: str


_executor = None


def get_executor():
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=2)
    return _executor


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_resume(request: OptimizeRequest):
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")

    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")

    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(
                get_executor(),
                run_optimization,
                request.job_description,
                request.resume_text,
                request.user_id
            ),
            timeout=10.0
        )

        score_before = result.get("ats_score_before")
        score_after = result.get("ats_score_after")

        return OptimizeResponse(
            modified_resume=result.get("modified_resume", ""),
            ats_score_before=score_before.get("score") if isinstance(score_before, dict) and score_before else score_before,
            ats_score_after=score_after.get("score") if isinstance(score_after, dict) and score_after else score_after,
            status=result.get("final_status", "completed")
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Agent optimization timed out (10s limit)"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent optimization failed: {str(e)}"
        )

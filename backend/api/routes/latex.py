from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from services.latex_service import compile_latex, validate_latex_code, LaTeXCompilationError
from io import BytesIO
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/latex", tags=["latex"])


class CompileRequest(BaseModel):
    latex_code: str = Field(..., min_length=1, description="Complete LaTeX document code")


@router.post(
    "/compile",
    summary="Compile LaTeX to PDF",
    description="Compiles LaTeX code to PDF using external service",
    responses={
        200: {
            "description": "Successfully compiled PDF",
            "content": {"application/pdf": {}},
        },
        400: {
            "description": "Invalid LaTeX code",
            "content": {
                "application/json": {
                    "example": {"detail": "Missing \\documentclass declaration"}
                }
            },
        },
        408: {
            "description": "Compilation timeout",
            "content": {
                "application/json": {
                    "example": {"detail": "Compilation timed out after 30s"}
                }
            },
        },
        500: {
            "description": "Compilation failed",
            "content": {
                "application/json": {
                    "example": {"detail": "LaTeX compilation error: Undefined control sequence"}
                }
            },
        },
    },
)
async def compile_latex_endpoint(request: CompileRequest):
    # Validate and compile LaTeX to PDF
    
    # Check if the LaTeX looks valid before sending to compiler
    is_valid, error_message = validate_latex_code(request.latex_code)
    if not is_valid:
        logger.warning(f"Invalid LaTeX code: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid LaTeX: {error_message}"
        )
    
    try:
        logger.info("Starting LaTeX compilation")
        pdf_bytes = compile_latex(request.latex_code)
        logger.info("LaTeX compilation successful")
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=resume.pdf",
                "Content-Length": str(len(pdf_bytes)),
            }
        )
        
    except httpx.TimeoutException:
        logger.error("LaTeX compilation timed out")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Compilation timed out. The document may be too complex or the service is slow. Please try again."
        )
        
    except LaTeXCompilationError as e:
        logger.error(f"LaTeX compilation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
    except Exception as e:
        logger.exception("Unexpected error during LaTeX compilation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compilation failed: {str(e)}"
        )

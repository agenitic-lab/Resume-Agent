from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.latex_service import compile_latex
from io import BytesIO

router = APIRouter(prefix="/api/latex", tags=["latex"])

class CompileRequest(BaseModel):
    latex_code: str

@router.post("/compile")
async def compile_latex_endpoint(request: CompileRequest):
    # Validate LaTeX code
    if not request.latex_code.strip():
        raise HTTPException(status_code=400, detail="LaTeX code cannot be empty")
    
    if "\\documentclass" not in request.latex_code:
        raise HTTPException(status_code=400, detail="Invalid LaTeX: missing \\documentclass")
    
    try:
        pdf_bytes = compile_latex(request.latex_code)
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=resume.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compilation failed: {str(e)}")

from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.resume import Resume
from schemas.resume_builder import ResumeCreate, ATSAnalysisResponse
from uuid import UUID
from database.models.user import User
from auth.dependencies import get_current_user
from services.latex_renderer import render_latex_to_pdf, render_latex_source
from services.latex_templates import TEMPLATES as BUILTIN_LATEX_TEMPLATES
from services.ai_resume_generator import generate_ats_bullets, generate_ats_summary, generate_ats_project_bullets, analyze_resume_for_ats, apply_ai_optimizations
from core.security import decrypt_api_key
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/resume", tags=["Resume Builder"])


@router.get("/list")
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "field": r.field,
            "name": (r.contact or {}).get("name", "Untitled Resume"),
            "experience_level": r.experience_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in resumes
    ]

@router.post("/create")
def create_resume(
    payload: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    contact_data = payload.contact.copy()
    contact_data["custom_sections"] = payload.custom_sections

    resume = Resume(
        user_id=current_user.id,
        field=payload.field,
        experience_level=payload.experience_level,
        contact=contact_data,
        experience=payload.experience,
        education=payload.education,
        projects=payload.projects or [],
        skills=payload.skills
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "resume_id": str(resume.id),
        "message": "Resume draft saved successfully"
    }

@router.post("/analyze", response_model=ATSAnalysisResponse)
def analyze_resume(
    payload: ResumeCreate,
    current_user: User = Depends(get_current_user)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(status_code=400, detail="Set your API key in Settings before analyzing resume.")
    
    try:
        api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key. Please reset it in Settings.")

    # Convert payload to dict for analysis
    resume_data = payload.dict()
    analysis_result = analyze_resume_for_ats(resume_data, api_key)
    
    return analysis_result

from schemas.resume_builder import OptimizationRequest

@router.post("/optimize")
def optimize_resume(
    payload: OptimizationRequest,
    current_user: User = Depends(get_current_user)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(status_code=400, detail="Set your API key in Settings before optimizing resume.")
    
    try:
        api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key. Please reset it in Settings.")

    resume_data = payload.resume_data.dict()
    recommendations = [r.dict() for r in payload.selected_recommendations]
    
    optimized_data = apply_ai_optimizations(resume_data, recommendations, api_key)
    
    return optimized_data

@router.get("/preview/{resume_id}/{template_name}")
def preview_resume(
    resume_id: UUID,
    template_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        data = {
            "contact": resume.contact,
            "field": resume.field,
            "experience": resume.experience,
            "education": resume.education,
            "projects": resume.projects or [],
            "skills": resume.skills
        }
        
        if template_name in BUILTIN_LATEX_TEMPLATES:
            pdf = render_latex_to_pdf(template_name, data)
            return Response(content=pdf, media_type="application/pdf")
        else:
            raise HTTPException(status_code=400, detail="Invalid template selected.")
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Template rendering failed: {str(e)}")


@router.get("/source/{resume_id}/{template_name}")
def get_resume_source(
    resume_id: UUID,
    template_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        data = {
            "contact": resume.contact,
            "field": resume.field,
            "experience": resume.experience,
            "education": resume.education,
            "projects": resume.projects or [],
            "skills": resume.skills,
            "custom_sections": resume.contact.get("custom_sections", [])
        }
        
        if template_name in BUILTIN_LATEX_TEMPLATES:
            latex_code = render_latex_source(template_name, data)
            return {"latex_code": latex_code}
        else:
            raise HTTPException(status_code=400, detail="Invalid template selected.")
            
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Failed to generate source code: {str(e)}")


@router.get("/download/{resume_id}/{template_name}")
def download_resume(
    resume_id: UUID,
    template_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
         raise HTTPException(status_code=404, detail="Resume not found")

    try:
        data = {
            "contact": resume.contact,
            "field": resume.field,
            "experience": resume.experience,
            "education": resume.education,
            "projects": resume.projects or [],
            "skills": resume.skills,
            "custom_sections": resume.contact.get("custom_sections", [])
        }
        
        if template_name in BUILTIN_LATEX_TEMPLATES:
            pdf = render_latex_to_pdf(template_name, data)
        else:
            raise HTTPException(status_code=400, detail="Invalid template selected.")

        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=resume.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

class BulletGenerationRequest(BaseModel):
    role: str
    technologies: List[str]
    keywords: List[str]
    field: str | None = None  # user's target job title for field detection

@router.post("/generate-bullets")
def generate_bullets(
    payload: BulletGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(status_code=400, detail="Set your API key in Settings before generating bullets.")
    
    try:
        api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key. Please reset it in Settings.")

    bullets = generate_ats_bullets(
        role=payload.role,
        technologies=payload.technologies,
        keywords=payload.keywords,
        api_key=api_key
    )
    return {"bullets": bullets}

class SummaryGenerationRequest(BaseModel):
    current_role: str
    experience_level: str
    keywords: List[str]
    experience: List[dict] | None = []
    projects: List[dict] | None = []
    education: List[dict] | None = []
    skills: List[str] | None = []

@router.post("/generate-summary")
def generate_summary(
    payload: SummaryGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(status_code=400, detail="Set your API key in Settings before generating summary.")
    
    try:
        api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key. Please reset it in Settings.")

    summary = generate_ats_summary(
        current_role=payload.current_role,
        experience_level=payload.experience_level,
        keywords=payload.keywords,
        experience=payload.experience,
        projects=payload.projects,
        education=payload.education,
        skills=payload.skills,
        api_key=api_key
    )
    return {"summary": summary}

class ProjectGenerationRequest(BaseModel):
    project_name: str
    project_type: str | None = "Professional Project"
    role: str
    technologies: List[str]
    keywords: List[str]

@router.post("/generate-project-bullets")
def generate_project_bullets(
    payload: ProjectGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(status_code=400, detail="Set your API key in Settings before generating project bullets.")
    
    try:
        api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key. Please reset it in Settings.")

    bullets = generate_ats_project_bullets(
        project_name=payload.project_name,
        project_type=payload.project_type,
        role=payload.role,
        technologies=payload.technologies,
        keywords=payload.keywords,
        api_key=api_key
    )
    return {"bullets": bullets}

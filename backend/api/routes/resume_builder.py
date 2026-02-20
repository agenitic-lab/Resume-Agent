from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.resume import Resume
from schemas.resume_builder import ResumeCreate
from uuid import UUID
from database.models.user import User
from auth.dependencies import get_current_user
from services.template_renderer import render_resume, generate_pdf
from services.ai_resume_generator import generate_ats_bullets, generate_ats_summary, generate_ats_project_bullets
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/resume", tags=["Resume Builder"])

@router.post("/create")
def create_resume(
    payload: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    resume = Resume(
        user_id=current_user.id,
        field=payload.field,
        experience_level=payload.experience_level,
        contact=payload.contact,
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
        html = render_resume(
            f"{template_name}.html",
            {
                "contact": resume.contact,
                "field": resume.field,
                "experience": resume.experience,
                "education": resume.education,
                "projects": resume.projects or [],
                "skills": resume.skills
            }
        )
        return Response(content=html, media_type="text/html")
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Template rendering failed: {str(e)}")


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
        html = render_resume(
            f"{template_name}.html",
            {
                "contact": resume.contact,
                "field": resume.field,
                "experience": resume.experience,
                "education": resume.education,
                "projects": resume.projects or [],
                "skills": resume.skills
            }
        )

        pdf = generate_pdf(html)

        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=resume.pdf"}
        )
    except (OSError, ImportError, RuntimeError) as e:
        # Common error on Windows when GTK is missing
        error_msg = str(e)
        if any(kw in error_msg.lower() for kw in ["gobject", "pango", "cairo", "gtk3", "unavailable"]):
             raise HTTPException(
                status_code=503, 
                detail=f"{error_msg}. Please install GTK3 for Windows to enable native PDF downloads."
            )
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {error_msg}")
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
    bullets = generate_ats_bullets(
        role=payload.role,
        technologies=payload.technologies,
        keywords=payload.keywords
    )
    return {"bullets": bullets}

class SummaryGenerationRequest(BaseModel):
    current_role: str
    experience_level: str
    keywords: List[str]

@router.post("/generate-summary")
def generate_summary(
    payload: SummaryGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    summary = generate_ats_summary(
        current_role=payload.current_role,
        experience_level=payload.experience_level,
        keywords=payload.keywords
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
    bullets = generate_ats_project_bullets(
        project_name=payload.project_name,
        project_type=payload.project_type,
        role=payload.role,
        technologies=payload.technologies,
        keywords=payload.keywords
    )
    return {"bullets": bullets}

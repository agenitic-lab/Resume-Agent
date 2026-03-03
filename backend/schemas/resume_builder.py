from pydantic import BaseModel, Field
from typing import List, Dict

class ResumeCreate(BaseModel):
    field: str = Field(..., min_length=1)
    experience_level: str = Field(..., min_length=1)
    contact: Dict
    experience: List[Dict]
    education: List[Dict]
    projects: List[Dict] | None = []
    skills: List[str]
    custom_sections: List[Dict] | None = []


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    preview: str | None

class Recommendation(BaseModel):
    issue: str
    solution: str
    impact: str # "High", "Medium", "Low"
    tags: List[str]

class OptimizationRequest(BaseModel):
    resume_data: ResumeCreate
    selected_recommendations: List[Recommendation]

class ATSAnalysisResponse(BaseModel):
    score: int
    score_label: str # e.g. "Needs Work", "Good", "Excellent"
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[Recommendation]

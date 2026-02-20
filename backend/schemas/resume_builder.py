from pydantic import BaseModel
from typing import List, Dict

class ResumeCreate(BaseModel):
    field: str
    experience_level: str
    contact: Dict
    experience: List[Dict]
    education: List[Dict]
    projects: List[Dict] | None = []
    skills: List[str]


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    preview: str | None

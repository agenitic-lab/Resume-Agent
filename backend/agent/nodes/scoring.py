from typing import Dict
from ..state import ResumeAgentState


def score_resume(state: ResumeAgentState) -> Dict:
    """
    ATS Scoring Node (AG-19)

    Calculates an ATS score (0–100) for a resume based on:
    - Keywords match (40)
    - Required skills match (30)
    - Resume format quality (15)
    - Section presence (15)
    """

    resume = state.get("original_resume", "").lower()
    requirements = state.get("job_requirements", {}) or {}

    # --- Initialize scores ---
    keyword_score = 0.0
    skills_score = 0.0
    format_score = 0.0
    section_score = 0.0

    # --- 1. KEYWORDS (40) ---
    keywords = requirements.get("key_keywords", [])
    matched_keywords = [k for k in keywords if k.lower() in resume]

    if keywords:
        keyword_score = (len(matched_keywords) / len(keywords)) * 40

    # --- 2. REQUIRED SKILLS (30) ---
    required_skills = requirements.get("required_skills", [])
    matched_skills = [s for s in required_skills if s.lower() in resume]

    if required_skills:
        skills_score = (len(matched_skills) / len(required_skills)) * 30

    # --- 3. FORMAT QUALITY (15) ---
    word_count = len(resume.split())

    if 300 <= word_count <= 1000:
        format_score += 8
    elif 200 <= word_count <= 1200:
        format_score += 4

    if "-" in resume or "•" in resume or "*" in resume:
        format_score += 4

    if "\n\n" in resume:
        format_score += 3

    # --- 4. SECTION PRESENCE (15) ---
    sections = {
        "experience": ["experience", "work history"],
        "skills": ["skills", "technical skills"],
        "education": ["education", "degree"],
        "summary": ["summary", "profile", "objective"]
    }

    found_sections = 0
    for keywords in sections.values():
        if any(k in resume for k in keywords):
            found_sections += 1

    section_score = (found_sections / len(sections)) * 15

    # --- TOTAL SCORE ---
    total_score = round(
        min(keyword_score + skills_score + format_score + section_score, 100),
        2
    )

    return {
        "ats_score_before": {
            "score": total_score,
            "breakdown": {
                "keywords": round(keyword_score, 2),
                "skills": round(skills_score, 2),
                "format": round(format_score, 2),
                "sections": round(section_score, 2),
            }
        }
    }

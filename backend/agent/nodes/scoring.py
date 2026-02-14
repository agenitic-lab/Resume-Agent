from typing import Dict, Tuple


def _score_resume_text(resume_text: str, requirements: Dict) -> Tuple[float, Dict[str, float]]:
    resume = (resume_text or "").lower()
    requirements = requirements or {}

    keyword_score = 0.0
    skills_score = 0.0
    format_score = 0.0
    section_score = 0.0

    # keywords matching (40 points)
    keywords = requirements.get("key_keywords", [])
    matched_keywords = [k for k in keywords if k.lower() in resume]

    if keywords:
        keyword_score = (len(matched_keywords) / len(keywords)) * 40

    # required skills matching (30 points)
    required_skills = requirements.get("required_skills", [])
    matched_skills = [s for s in required_skills if s.lower() in resume]

    if required_skills:
        skills_score = (len(matched_skills) / len(required_skills)) * 30

    # format quality (15 points)
    word_count = len(resume.split())

    if 300 <= word_count <= 1000:
        format_score += 8
    elif 200 <= word_count <= 1200:
        format_score += 4

    if "-" in resume or "•" in resume or "*" in resume:
        format_score += 4

    if "\n\n" in resume:
        format_score += 3

    # section presence (15 points)
    sections = {
        "experience": ["experience", "work history"],
        "skills": ["skills", "technical skills"],
        "education": ["education", "degree"],
        "summary": ["summary", "profile", "objective"]
    }

    found_sections = 0
    for keys in sections.values():
        if any(k in resume for k in keys):
            found_sections += 1

    section_score = (found_sections / len(sections)) * 15

    total_score = round(
        min(keyword_score + skills_score + format_score + section_score, 100),
        2
    )

    breakdown = {
        "keywords": round(keyword_score, 2),
        "skills": round(skills_score, 2),
        "format": round(format_score, 2),
        "sections": round(section_score, 2),
    }

    return total_score, breakdown


def score_resume(state: Dict) -> Dict:
    score_value, breakdown = _score_resume_text(
        resume_text=state.get("original_resume", ""),
        requirements=state.get("job_requirements", {}),
    )

    existing_history = state.get("score_history", []) or []
    updated_history = list(existing_history) + [score_value]

    decision = {
        "node": "score_initial",
        "action": "scored_original_resume",
        "score": score_value,
    }

    return {
        "ats_score_before": score_value,
        "ats_breakdown_before": breakdown,
        "score_history": updated_history,
        "decision_log": state.get("decision_log", []) + [decision],
    }

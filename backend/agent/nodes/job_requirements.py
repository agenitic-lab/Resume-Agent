import logging
from typing import Dict
import json
from .llm_client import build_groq_client
from config import settings

logger = logging.getLogger(__name__)


def _safe_parse_json(content: str, fallback: Dict) -> Dict:
    """Parse JSON from LLM response, handling markdown code blocks and errors."""
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM JSON in extract_job_requirements, using fallback")
        return fallback


def extract_job_requirements(state: Dict) -> Dict:
    client = build_groq_client(state)

    job_description = state["job_description"]

    prompt = f"""Extract structured requirements from this job description:

{job_description}

Return JSON with:
- job_title: the exact job title being advertised (e.g. "Software Developer", "Data Analyst")
- required_skills: list of must-have skills
- preferred_skills: list of nice-to-have skills
- experience_years: minimum years required (number or null)
- key_keywords: important keywords for ATS (list)

Return ONLY valid JSON, no other text."""

    response = client.chat.completions.create(
        model=settings.JOB_REQUIREMENTS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=settings.MAX_TOKENS,
    )

    content = response.choices[0].message.content

    requirements = _safe_parse_json(content, {
        "job_title": "Unknown",
        "required_skills": [],
        "preferred_skills": [],
        "experience_years": None,
        "key_keywords": [],
    })

    decision = {
        "node": "extract_requirements",
        "action": "extracted_job_requirements",
        "detail": f"Identified {len(requirements.get('required_skills', []))} required skills, "
                  f"{len(requirements.get('preferred_skills', []))} preferred skills, "
                  f"and {len(requirements.get('key_keywords', []))} ATS keywords",
        "job_title": requirements.get("job_title", "Unknown"),
        "skills_count": len(requirements.get("required_skills", [])),
        "keywords_count": len(requirements.get("key_keywords", [])),
    }

    return {
        "job_requirements": requirements,
        "decision_log": state.get("decision_log", []) + [decision],
    }

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
        logger.warning("Failed to parse LLM JSON in analyze_resume, using fallback")
        return fallback


def analyze_resume(state: Dict) -> Dict:
    client = build_groq_client(state)

    resume = state["original_resume"]
    job_requirements = state["job_requirements"]

    prompt = f"""Analyze this resume against the job requirements.

Resume:
{resume}

Job Requirements:
{json.dumps(job_requirements, indent=2)}

Return JSON with:
- strengths: list of resume strengths matching the job
- weaknesses: list of areas where resume falls short
- missing_keywords: keywords present in requirements but missing in resume
- suggestions: specific improvements to make

Return ONLY valid JSON, no other text."""

    response = client.chat.completions.create(
        model=settings.RESUME_ANALYSIS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=settings.MAX_TOKENS,
    )

    content = response.choices[0].message.content

    analysis = _safe_parse_json(content, {
        "strengths": [],
        "weaknesses": ["Could not parse LLM response"],
        "missing_keywords": [],
        "suggestions": [],
    })

    decision = {
        "node": "analyze_resume",
        "action": "analyzed_resume",
        "detail": f"Found {len(analysis.get('strengths', []))} strengths and "
                  f"{len(analysis.get('weaknesses', []))} weaknesses. "
                  f"{len(analysis.get('missing_keywords', []))} keywords missing from resume",
        "strengths_count": len(analysis.get("strengths", [])),
        "weaknesses_count": len(analysis.get("weaknesses", [])),
        "missing_keywords": analysis.get("missing_keywords", [])[:5],
    }

    return {
        "resume_analysis": analysis,
        "decision_log": state.get("decision_log", []) + [decision],
    }

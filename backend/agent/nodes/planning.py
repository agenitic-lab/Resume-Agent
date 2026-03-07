from typing import Dict
import json
from .llm_client import build_groq_client
from config import settings


def _safe_json_load(content: str) -> Dict:
    # Parse JSON from LLM response, handling code blocks and errors
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "priority_changes": [],
            "skill_additions": [],
            "keyword_insertions": [],
            "section_improvements": [],
            "expected_score_gain": 0,
            "reasoning": "LLM response could not be parsed",
            "parse_error": True,
        }


def plan_improvements(state: Dict) -> Dict:
    # Create improvement plan by comparing job requirements with resume gaps

    # Make sure we have the data we need
    required_fields = ["job_requirements", "resume_analysis", "ats_score_before"]
    for field in required_fields:
        if field not in state or state[field] is None:
            raise ValueError(f"Missing required state field: {field}")

    # On iteration 2+, use the latest score (ats_score_after from previous rescore),
    # not the original baseline. This lets the LLM plan based on the real current state.
    current_score = state.get("ats_score_after") or state["ats_score_before"]

    client = build_groq_client(state)

    prompt = f"""
You are an expert ATS optimization strategist and resume consultant.

Your task is to decide WHAT changes should be made to improve a resume's ATS score AND page fill.
Do NOT rewrite the resume. Only plan the improvements.

Job Requirements:
{json.dumps(state["job_requirements"], indent=2)}

Resume Analysis:
{json.dumps(state["resume_analysis"], indent=2)}

Current ATS Score: {current_score}

Create a resume improvement plan with the following JSON structure:

{{
  "priority_changes": [
    "Specific, high-impact change (max 6)"
  ],
  "skill_additions": [
    "Skills from the resume to emphasize or add to skills section"
  ],
  "keyword_insertions": [
    "Exact ATS keywords from the JD to include naturally"
  ],
  "section_improvements": [
    "Sections that need improvement (e.g., Experience, Skills, Summary)"
  ],
  "content_expansion": [
    "Specific ways to expand thin sections to fill the page — e.g., add Summary, expand bullet points, add skill categories"
  ],
  "expected_score_gain": <number>,
  "reasoning": "Why these changes will improve ATS score and page fill"
}}

Rules:
- Be specific
- Be realistic
- You SHOULD suggest adding a Professional Summary section if one is missing — it is derived from existing skills
- You SHOULD suggest expanding sparse bullet points with more detail from existing experience
- You SHOULD suggest splitting skills into labelled categories (Languages, Frameworks, Databases, etc.)
- You SHOULD suggest reordering sections: for juniors (0-2 yrs): Skills/Projects before Experience; for experienced: Experience first
- Do NOT suggest adding "Areas of Interest" or "Hobbies" sections — they waste space and add no ATS value
- Do NOT suggest inventing new jobs, new companies, or new certifications not mentioned in the original resume
- Do NOT suggest adding a Certifications section unless the original resume already contains actual certifications — suggesting placeholder certifications is strictly forbidden
- Do NOT suggest adding Awards, Publications, Volunteer Work, or any new section unless that section's content already exists in the original resume
- Focus on keyword optimization, better phrasing, content expansion, and structural improvements
- Return ONLY valid JSON
"""

    response = client.chat.completions.create(
        model=settings.PLANNING_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=settings.DEFAULT_TEMPERATURE,
        max_tokens=settings.MAX_TOKENS,
    )

    plan = _safe_json_load(response.choices[0].message.content)

    # Track what the agent decided to do
    priority_changes = plan.get("priority_changes", [])
    decision = {
        "node": "planning",
        "action": "created_improvement_plan",
        "priority_changes": len(priority_changes),
        "expected_gain": plan.get("expected_score_gain", 0),
        "detail": f"Created improvement plan with {len(priority_changes)} priority changes. "
                  f"Expected score gain: +{plan.get('expected_score_gain', 0)}. "
                  f"Focus areas: {', '.join(plan.get('section_improvements', [])[:3]) or 'general optimization'}",
        "changes_summary": [str(c)[:80] for c in priority_changes[:3]],
        "reasoning": plan.get("reasoning", ""),
    }

    return {
        "improvement_plan": plan,
        "decision_log": state.get("decision_log", []) + [decision],
    }

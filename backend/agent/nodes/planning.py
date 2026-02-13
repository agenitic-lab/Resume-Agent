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

    client = build_groq_client(state)

    prompt = f"""
You are an expert ATS optimization strategist.

Your task is to decide WHAT changes should be made to improve a resume.
Do NOT rewrite the resume. Only plan the improvements.

Job Requirements:
{json.dumps(state["job_requirements"], indent=2)}

Resume Analysis:
{json.dumps(state["resume_analysis"], indent=2)}

Current ATS Score: {state["ats_score_before"]}

Create a resume improvement plan with the following JSON structure:

{{
  "priority_changes": [
    "Specific, high-impact change (max 5)"
  ],
  "skill_additions": [
    "Skills to add or emphasize"
  ],
  "keyword_insertions": [
    "Exact ATS keywords to include"
  ],
  "section_improvements": [
    "Sections that need improvement (e.g., Experience, Skills, Summary)"
  ],
  "expected_score_gain": <number>,
  "reasoning": "Why these changes will improve ATS score"
}}

Rules:
- Be specific
- Be realistic
- Do NOT invent skills
- Return ONLY valid JSON
"""

    response = client.chat.completions.create(
        model=settings.PLANNING_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=settings.DEFAULT_TEMPERATURE
    )

    plan = _safe_json_load(response.choices[0].message.content)

    # Track what the agent decided to do
    decision = {
        "node": "planning",
        "action": "created_improvement_plan",
        "priority_changes": len(plan.get("priority_changes", [])),
        "expected_gain": plan.get("expected_score_gain", 0),
    }

    return {
        "improvement_plan": plan,
        "decision_log": state.get("decision_log", []) + [decision],
    }

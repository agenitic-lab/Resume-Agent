from typing import Dict
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()

MODEL = os.getenv("PLANNING_MODEL", "llama-3.3-70b-versatile")


def _safe_json_load(content: str) -> Dict:
    """
    Safely extract JSON from LLM output.
    Handles markdown code blocks and malformed responses.
    """
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
    """
    LangGraph Node: Improvement Planning

    Compares job requirements with resume analysis and
    creates a prioritized, actionable improvement plan.
    """

    # ---- HARD VALIDATION (ENGINEER MOVE) ----
    required_fields = ["job_requirements", "resume_analysis", "ats_score_before"]
    for field in required_fields:
        if field not in state or state[field] is None:
            raise ValueError(f"Missing required state field: {field}")

    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

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
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    plan = _safe_json_load(response.choices[0].message.content)

    # ---- DECISION LOG (AGENT BEHAVIOR) ----
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

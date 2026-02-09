"""
Resume Modification Node

Applies an improvement plan to the original resume
and produces an optimized version while preserving structure.
"""

from typing import Dict
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()


def modify_resume(state: Dict) -> Dict:
    # ---- VALIDATION (fail fast) ----
    if "original_resume" not in state:
        raise ValueError("original_resume missing from state")

    if "improvement_plan" not in state:
        raise ValueError("improvement_plan missing from state")

    original_resume = state["original_resume"]
    plan = state["improvement_plan"]

    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

    prompt = f"""
You are an expert resume writer.

Your task:
- Apply the improvement plan to the resume
- Preserve the resume structure and sections
- Do NOT invent experience
- Do NOT remove existing valid content
- Only improve clarity, keywords, and phrasing
- Keep formatting clean and professional

Original Resume:
---
{original_resume}
---

Improvement Plan:
---
{json.dumps(plan, indent=2)}
---

Return ONLY the improved resume text.
Do NOT return JSON.
Do NOT add explanations.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    modified_resume = response.choices[0].message.content.strip()

    decision = {
        "node": "modify_resume",
        "action": "resume_modified",
        "changes_applied": len(plan.get("priority_changes", []))
    }

    return {
        "modified_resume": modified_resume,
        "decision_log": state.get("decision_log", []) + [decision]
    }

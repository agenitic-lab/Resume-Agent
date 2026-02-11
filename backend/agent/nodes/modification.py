from typing import Dict
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()

_LATEX_TYPO_FIXES = {
    "\\end{itemitemize}": "\\end{itemize}",
    "\\begin{itemitemize}": "\\begin{itemize}",
    "\\end{enumerateenumerate}": "\\end{enumerate}",
    "\\begin{enumerateenumerate}": "\\begin{enumerate}",
}


def _sanitize_latex(latex: str) -> str:
    for typo, fix in _LATEX_TYPO_FIXES.items():
        latex = latex.replace(typo, fix)

    if "\\documentclass" not in latex:
        latex = "\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\begin{document}\n" + latex

    if "\\end{document}" not in latex:
        latex += "\n\\end{document}"

    return latex


def modify_resume(state: Dict) -> Dict:
    if "original_resume" not in state:
        raise ValueError("original_resume missing from state")

    if "improvement_plan" not in state:
        raise ValueError("improvement_plan missing from state")

    original_resume = state["original_resume"]
    plan = state["improvement_plan"]
    job_requirements = state.get("job_requirements", {})

    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

    prompt = f"""You are an expert resume writer and LaTeX typesetter.

Your task: Convert and optimize the resume below into a professional LaTeX document that is tailored to the job requirements.

RULES:
- Output a COMPLETE, compilable LaTeX document starting with \\documentclass
- Use only standard LaTeX packages (geometry, enumitem, hyperref, titlesec)
- Apply the improvement plan to strengthen the resume
- Incorporate relevant keywords from the job requirements naturally
- Do NOT invent experience or skills the candidate doesn't have
- Do NOT remove existing valid content
- Improve clarity, keywords, and phrasing to match the job description
- Use clean, professional formatting with proper sections

Original Resume:
---
{original_resume}
---

Job Requirements:
---
{json.dumps(job_requirements, indent=2)}
---

Improvement Plan:
---
{json.dumps(plan, indent=2)}
---

Return ONLY the complete LaTeX code. No explanations, no markdown code blocks, no backticks.
Start directly with \\documentclass and end with \\end{{document}}."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    raw_output = response.choices[0].message.content.strip()

    if raw_output.startswith("```"):
        lines = raw_output.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw_output = "\n".join(lines).strip()

    modified_resume = _sanitize_latex(raw_output)

    decision = {
        "node": "modify_resume",
        "action": "resume_modified_as_latex",
        "changes_applied": len(plan.get("priority_changes", []))
    }

    return {
        "modified_resume": modified_resume,
        "decision_log": state.get("decision_log", []) + [decision]
    }

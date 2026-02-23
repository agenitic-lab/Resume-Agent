from typing import Dict
import json
from .llm_client import build_groq_client
from config import settings

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
        preamble = "\\documentclass[11pt]{article}\n"
        # Only add geometry if not already present in a usepackage declaration
        has_geometry = ("\\usepackage{geometry}" in latex or 
                        ("\\usepackage[" in latex and "]{geometry}" in latex))
        if not has_geometry:
            preamble += "\\usepackage[margin=1in]{geometry}\n"
        preamble += "\\begin{document}\n"
        latex = preamble + latex

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

    client = build_groq_client(state)

    prompt = f"""You are an expert resume writer and LaTeX typesetter.

Your task: Optimize the resume below into a professional LaTeX document tailored to the job requirements.

CRITICAL RULES (MUST FOLLOW):
1. PAGE LENGTH: The resume MUST fit on exactly 1 page. If the candidate has extensive experience (10+ years), 2 pages maximum. Use compact formatting - small margins (0.5in), concise bullet points, and efficient spacing. NEVER exceed 2 pages.
2. NO INVENTED CONTENT: ONLY use information that exists in the original resume. Do NOT add, fabricate, or invent ANY experiences, jobs, projects, skills, certifications, or achievements that are not already present. You may REPHRASE existing content to better match keywords, but NEVER create new entries.
3. PRESERVE ORIGINAL STRUCTURE: Keep the same sections that exist in the original resume (e.g., if it has Education, Experience, Projects, Skills - keep those same sections). Do not add new sections that weren't in the original.
4. CLEAN PROFESSIONAL DESIGN: Use a clean, minimal, black-and-white professional template. NO colored backgrounds, NO colored text, NO shading, NO dark themes. Use standard black text on white background.
5. Output a COMPLETE, compilable LaTeX document starting with \\documentclass
6. Use only standard LaTeX packages (geometry, enumitem, hyperref, titlesec, fontenc, inputenc)
7. Apply the improvement plan to strengthen existing content through better phrasing and keyword integration
8. Incorporate relevant keywords from the job requirements NATURALLY into existing content
9. Do NOT remove existing valid content - optimize it instead
10. Use \\documentclass[10pt]{{article}} with \\usepackage[margin=0.5in]{{geometry}} for compact single-page layout
11. Use \\pagestyle{{empty}} to remove page numbers and headers/footers
12. Keep bullet points concise (1-2 lines each, max 3-4 bullets per experience entry)
13. Use \\small or \\footnotesize for body text if needed to fit on one page

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
        model=settings.MODIFICATION_MODEL,
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

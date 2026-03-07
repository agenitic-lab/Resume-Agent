import re
from typing import Dict, Tuple


def _strip_latex(text: str) -> str:
    """Convert LaTeX source to plain text for fair ATS scoring.

    Removes commands, environments, and common LaTeX escapes so that
    keyword / skill matching works the same way on both the original
    plain-text resume and the LLM-generated LaTeX output.
    """
    if not text:
        return ""

    t = text

    # Remove LaTeX comments (lines starting with %)
    t = re.sub(r'(?m)^%.*$', '', t)
    t = re.sub(r'(?<!\\)%.*$', '', t, flags=re.MULTILINE)

    # Replace common LaTeX escape sequences with their plain equivalents
    t = t.replace('\\&', '&')
    t = t.replace('\\%', '%')
    t = t.replace('\\$', '$')
    t = t.replace('\\#', '#')
    t = t.replace('\\_', '_')
    t = t.replace('\\textbackslash', '\\')
    t = t.replace('\\\\', '\n')  # line breaks -> newlines
    t = t.replace('~', ' ')
    t = t.replace('\\,', ' ')
    t = t.replace('\\;', ' ')
    t = t.replace('\\:', ' ')
    t = t.replace('\\!', '')
    t = t.replace('\\newline', '\n')
    t = t.replace('\\par', '\n\n')

    # Strip \begin{...} and \end{...}
    t = re.sub(r'\\(?:begin|end)\{[^}]*\}', ' ', t)

    # Strip \documentclass[...]{...} and \usepackage[...]{...} lines
    t = re.sub(r'\\(?:documentclass|usepackage|RequirePackage)(?:\[[^\]]*\])?\{[^}]*\}', '', t)

    # Remove \item markers (replace with bullet-like marker for format scoring)
    t = re.sub(r'\\item\b\s*', '- ', t)

    # Strip known resume-template macros but keep their brace-group content
    # e.g. \textbf{React.js} -> React.js, \resumeItem{...} -> ...
    # We iteratively strip \command{content} -> content
    prev = None
    while prev != t:
        prev = t
        t = re.sub(r'\\[a-zA-Z@]+\*?\{([^{}]*)\}', r'\1', t)

    # Remove remaining commands with no arguments (e.g. \vspace, \hfill, \small)
    t = re.sub(r'\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?', ' ', t)

    # Remove leftover braces and math-mode delimiters
    t = t.replace('{', '').replace('}', '')
    t = t.replace('$', '')

    # Collapse whitespace
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)

    return t.strip()


def _word_boundary_match(term: str, text: str) -> bool:
    """Check if *term* appears in *text* as a whole word/phrase.

    Prevents false positives like 'java' matching 'javascript'.
    """
    pattern = r'(?<![a-zA-Z0-9_.])' + re.escape(term) + r'(?![a-zA-Z0-9_])'
    return bool(re.search(pattern, text))


def _score_resume_text(resume_text: str, requirements: Dict) -> Tuple[float, Dict[str, float]]:
    resume = _strip_latex(resume_text or "").lower()
    requirements = requirements or {}

    keyword_score = 0.0
    skills_score = 0.0
    format_score = 0.0
    section_score = 0.0

    # keywords matching (40 points)
    keywords = requirements.get("key_keywords", [])
    matched_keywords = [k for k in keywords if _word_boundary_match(k.lower(), resume)]

    if keywords:
        keyword_score = (len(matched_keywords) / len(keywords)) * 40

    # required skills matching (30 points)
    required_skills = requirements.get("required_skills", [])
    matched_skills = [s for s in required_skills if _word_boundary_match(s.lower(), resume)]

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
        "detail": f"Original resume scored {score_value}/100. "
                  f"Breakdown — Keywords: {breakdown['keywords']}/40, Skills: {breakdown['skills']}/30, "
                  f"Format: {breakdown['format']}/15, Sections: {breakdown['sections']}/15",
        "breakdown": breakdown,
    }

    return {
        "ats_score_before": score_value,
        "ats_breakdown_before": breakdown,
        "score_history": updated_history,
        "decision_log": state.get("decision_log", []) + [decision],
    }

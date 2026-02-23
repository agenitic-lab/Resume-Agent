from typing import Dict, Tuple, Optional
import json
import re
from .llm_client import build_groq_client
from config import settings

# Lazy imports to avoid circular imports
_template_service = None
_template_preamble_fn = None

def _get_template_service():
    global _template_service
    if _template_service is None:
        from services.latex_templates import get_template_style_instructions
        _template_service = get_template_style_instructions
    return _template_service

def _get_template_preamble(template_id: str) -> Optional[str]:
    """Get the raw preamble string for a built-in template."""
    global _template_preamble_fn
    if _template_preamble_fn is None:
        from services.latex_templates import get_template_preamble
        _template_preamble_fn = get_template_preamble
    return _template_preamble_fn(template_id)


_LATEX_TYPO_FIXES = {
    "\\end{itemitemize}": "\\end{itemize}",
    "\\begin{itemitemize}": "\\begin{itemize}",
    "\\end{enumerateenumerate}": "\\end{enumerate}",
    "\\begin{enumerateenumerate}": "\\begin{enumerate}",
}


def _sanitize_latex(latex: str, template_preamble: str = None) -> str:
    """Sanitize LLM output and assemble the final LaTeX document.
    
    When template_preamble is provided, the LLM output is treated as body-only:
    we strip any preamble the LLM may have included and prepend the correct one.
    """
    for typo, fix in _LATEX_TYPO_FIXES.items():
        latex = latex.replace(typo, fix)

    if template_preamble:
        # Template mode: LLM should have output body-only, but might have
        # included a preamble anyway. Strip it and use the real preamble.
        body = _extract_body(latex)
        # Assemble: preamble + \begin{document} + body + \end{document}
        return (
            template_preamble.rstrip()
            + "\n\n\\begin{document}\n"
            + body.strip()
            + "\n\\end{document}\n"
        )

    # No template: generic fallback
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


def _extract_body(latex: str) -> str:
    """Extract the document body from LLM output.
    
    If the output contains \\begin{document}...\\end{document}, extract just
    the body. Otherwise, return the whole string (assumed to be body-only).
    """
    # Try to find \begin{document} ... \end{document}
    begin_match = re.search(r'\\begin\{document\}', latex)
    if begin_match:
        body_start = begin_match.end()
        end_match = re.search(r'\\end\{document\}', latex[body_start:])
        if end_match:
            return latex[body_start:body_start + end_match.start()]
        else:
            return latex[body_start:]
    
    # No \begin{document} found — output is already body-only
    # But strip any leading \documentclass / \usepackage lines the LLM snuck in
    lines = latex.split('\n')
    body_lines = []
    in_preamble = True
    for line in lines:
        stripped = line.strip()
        if in_preamble:
            # Skip preamble-like lines
            if (stripped.startswith('\\documentclass') or
                stripped.startswith('\\usepackage') or
                stripped.startswith('\\RequirePackage') or
                stripped.startswith('\\newcommand') or
                stripped.startswith('\\renewcommand') or
                stripped.startswith('\\definecolor') or
                stripped.startswith('\\colorlet') or
                stripped.startswith('\\titleformat') or
                stripped.startswith('\\setlength') or
                stripped.startswith('\\geometry') or
                stripped.startswith('\\pagestyle') or
                stripped.startswith('\\input') or
                stripped.startswith('%') or
                stripped == ''):
                continue
            else:
                in_preamble = False
                body_lines.append(line)
        else:
            if stripped == '\\end{document}':
                continue
            body_lines.append(line)
    
    return '\n'.join(body_lines)


def _extract_job_title(job_requirements: Dict) -> str:
    """Extract the target job title from job requirements for headline alignment."""
    # Try to get from parsed requirements
    title = job_requirements.get("job_title", "")
    if not title:
        title = job_requirements.get("role", "")
    if not title:
        # Try to find from key_keywords that look like job titles
        keywords = job_requirements.get("key_keywords", [])
        for kw in keywords:
            # Job titles typically have words like Developer, Engineer, Manager, etc.
            title_words = ["developer", "engineer", "manager", "analyst", "designer",
                          "architect", "scientist", "consultant", "specialist",
                          "administrator", "coordinator", "director", "lead", "senior",
                          "junior", "intern", "associate", "principal", "staff"]
            if any(tw in kw.lower() for tw in title_words):
                title = kw
                break
    return title


def modify_resume(state: Dict) -> Dict:
    if "original_resume" not in state:
        raise ValueError("original_resume missing from state")

    if "improvement_plan" not in state:
        raise ValueError("improvement_plan missing from state")

    original_resume = state["original_resume"]
    plan = state["improvement_plan"]
    job_requirements = state.get("job_requirements", {})
    iteration = state.get("iteration_count", 0)

    # Get template style instructions if user has a template preference
    template_id = state.get("template_id")
    custom_latex = state.get("custom_template_latex")
    template_instructions = ""
    if template_id:
        get_style = _get_template_service()
        template_instructions = get_style(template_id, custom_latex)

    # Extract job title for headline alignment
    job_title = _extract_job_title(job_requirements)
    headline_instruction = ""
    if job_title:
        headline_instruction = f"""
14. HEADLINE/TITLE ALIGNMENT: The resume's professional title or headline MUST be updated to align
    with the target job. The target role is "{job_title}". Update the candidate's title/headline
    (the text under or near their name) to reflect this target role. For example, if the original
    says "Python Developer" but the job is for "Software Developer", change it to "Software Developer".
    Only change the title — keep the candidate's actual name unchanged."""

    client = build_groq_client(state)

    # Default design instructions when no template is selected
    default_design = """4. CLEAN PROFESSIONAL DESIGN: Use a clean, minimal, black-and-white professional template. NO colored backgrounds, NO colored text, NO shading, NO dark themes. Use standard black text on white background.
5. Output a COMPLETE, compilable LaTeX document starting with \\documentclass
6. Use only standard LaTeX packages (geometry, enumitem, hyperref, titlesec, fontenc, inputenc)
10. Use \\documentclass[10pt]{{article}} with \\usepackage[margin=0.5in]{{geometry}} for compact single-page layout
11. Use \\pagestyle{{empty}} to remove page numbers and headers/footers"""

    # Determine the actual preamble to prepend (for template mode)
    actual_preamble = None

    if template_instructions:
        # For built-in templates, get the preamble to prepend programmatically
        if template_id and template_id != "custom":
            actual_preamble = _get_template_preamble(template_id)
        elif template_id == "custom" and custom_latex:
            # For custom templates, extract preamble up to \begin{document}
            if "\\begin{document}" in custom_latex:
                actual_preamble = custom_latex[:custom_latex.index("\\begin{document}")]
            else:
                actual_preamble = custom_latex

        default_design = f"""4. FOLLOW THE TEMPLATE EXACTLY: You MUST use the exact macros, section commands,
   header format, and document structure specified in the TEMPLATE STYLE INSTRUCTIONS below.
   - Do NOT output any preamble, \\documentclass, \\usepackage, or \\newcommand lines.
   - Do NOT output \\begin{{document}} or \\end{{document}}.
   - Output ONLY the document body content using the template's macros.
   - Do NOT use generic LaTeX. Use ONLY the macros defined in the template.
   - Do NOT use \\section{{}} if the template example uses \\cvsection{{}}.
   - Do NOT use \\resumeProjectHeading if the template example uses \\resumeProject.
   - Do NOT invent your own formatting. Copy the EXACT structure from the example body.
   - The template's visual design (icons, gray boxes, font sizes) MUST appear in your output.
5. Output ONLY the document body (the content that goes between \\begin{{document}} and \\end{{document}}).
   The preamble will be added automatically. Do NOT include any preamble or document wrapper.

{template_instructions}"""

    # Page fitting instructions (Issue #5)
    page_fit_instructions = """
PAGE LAYOUT VALIDATION (CRITICAL — HIGHEST PRIORITY):
- The resume MUST fit on EXACTLY 1 page. This is a HARD REQUIREMENT for candidates with less than 10 years experience.
- If you estimate the content would spill onto a second page, you MUST cut content aggressively:
  * Reduce bullet points per experience entry to 2-3 maximum
  * Remove the least impactful/relevant entries (projects, certifications, etc.)
  * Use \\small or \\footnotesize for body text
  * Tighten spacing with \\vspace{-Xpt} between sections
  * Shorten bullet points to single lines where possible
- If content is too short and only fills 60-70% of the page, expand bullet points with more specific detail from the original resume to fill the page properly.
- NEVER produce a 2-page resume where the second page is less than 50% filled. Either fill both pages fully or cut to 1 page.
- Use \\pagestyle{empty} to remove page numbers and headers/footers
- Ensure consistent spacing between all sections — no uneven gaps
- The bottom margin should have minimal white space (no more than 1 inch of empty space at the bottom)"""

    prompt = f"""You are an expert resume writer and LaTeX typesetter.

Your task: Optimize the resume below into a professional LaTeX document tailored to the job requirements.
{"This is iteration " + str(iteration + 1) + " of optimization. Focus on improving areas that still need work." if iteration > 0 else ""}

CRITICAL RULES (MUST FOLLOW):
1. PAGE LENGTH: The resume MUST fit on EXACTLY 1 page. This is NON-NEGOTIABLE unless the candidate has 10+ years of experience. If content would overflow to a second page, you MUST remove the least relevant content, shorten bullet points, and tighten spacing until it fits on one page. A 2-page resume where the second page is mostly empty is UNACCEPTABLE — either fill both pages or cut to 1 page. Use compact formatting (\\small, tight \\vspace, 2-3 bullets per entry).
2. NO INVENTED CONTENT: ONLY use information that exists in the original resume. Do NOT add, fabricate, or invent ANY experiences, jobs, projects, skills, certifications, or achievements that are not already present. You may REPHRASE existing content to better match keywords, but NEVER create new entries.
3. PRESERVE ORIGINAL STRUCTURE: Keep the same sections that exist in the original resume (e.g., if it has Education, Experience, Projects, Skills - keep those same sections). Do not add new sections that weren't in the original.
{default_design}
7. Apply the improvement plan to strengthen existing content through better phrasing and keyword integration
8. Incorporate relevant keywords from the job requirements NATURALLY into existing content
9. Do NOT remove existing valid content - optimize it instead
12. Keep bullet points concise (1-2 lines each, max 3-4 bullets per experience entry)
13. Use \\small or \\footnotesize for body text if needed to fit on one page{headline_instruction}

{page_fit_instructions}

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
{"Output ONLY the document body. Do NOT include documentclass, usepackage, newcommand, begin{document}, or end{document}. Start directly with the first content command (e.g., begin{center} or fontfamily)." if actual_preamble else "Start directly with documentclass and end with end{document}."}"""

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

    modified_resume = _sanitize_latex(raw_output, template_preamble=actual_preamble)

    # Build detailed decision log entry
    headline_changed = bool(job_title)
    template_used = template_id or "default"
    decision = {
        "node": "modify_resume",
        "action": "resume_modified_as_latex",
        "iteration": iteration + 1,
        "changes_applied": len(plan.get("priority_changes", [])),
        "template_used": template_used,
        "headline_aligned_to": job_title if headline_changed else None,
        "keywords_targeted": plan.get("keyword_insertions", [])[:5],
        "detail": f"Generated optimized LaTeX resume using {template_used} template" + (
            f", aligned headline to '{job_title}'" if headline_changed else ""
        ),
    }

    return {
        "modified_resume": modified_resume,
        "decision_log": state.get("decision_log", []) + [decision]
    }

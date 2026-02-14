from typing import Dict, List, Tuple
import re
from config import settings


def _ratio(matched: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return matched / total


def _normalize_list(values: List[str]) -> List[str]:
    return [str(v).strip().lower() for v in values if str(v).strip()]


def _strip_latex(text: str) -> str:
    """Remove LaTeX commands and formatting to get clean text for matching."""
    # Remove comments
    text = re.sub(r'%.*$', '', text, flags=re.MULTILINE)
    # Remove common LaTeX commands but keep the text
    text = re.sub(r'\\[a-zA-Z]+\*?\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\[a-zA-Z]+\*?\s', ' ', text)
    # Remove math mode delimiters
    text = re.sub(r'\$\$?(.*?)\$\$?', r'\1', text)
    # Remove special characters
    text = re.sub(r'[\\{}\[\]~^_]', ' ', text)
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


def assess_job_fit(state: Dict) -> Dict:
    # Check if the resume is a good match for the job
    # Using simple keyword matching (no LLM needed) to save tokens
    requirements = state.get("job_requirements") or {}
    resume_raw = state.get("original_resume") or ""
    
    # Strip LaTeX formatting if present
    resume = _strip_latex(resume_raw)
    
    required = _normalize_list(requirements.get("required_skills", []))
    preferred = _normalize_list(requirements.get("preferred_skills", []))
    keywords = _normalize_list(requirements.get("key_keywords", []))

    matched_required = [s for s in required if s in resume]
    matched_preferred = [s for s in preferred if s in resume]
    matched_keywords = [k for k in keywords if k in resume]

    required_ratio = _ratio(len(matched_required), len(required))
    keyword_ratio = _ratio(len(matched_keywords), len(keywords))
    preferred_ratio = _ratio(len(matched_preferred), len(preferred))

    fit_score = round((required_ratio * 0.6) + (keyword_ratio * 0.3) + (preferred_ratio * 0.1), 3)
    
    # Debug logging
    print(f"[FIT_CHECK] Required: {len(matched_required)}/{len(required)} ({required_ratio:.2f})")
    print(f"[FIT_CHECK] Keywords: {len(matched_keywords)}/{len(keywords)} ({keyword_ratio:.2f})")
    print(f"[FIT_CHECK] Preferred: {len(matched_preferred)}/{len(preferred)} ({preferred_ratio:.2f})")
    print(f"[FIT_CHECK] Final Fit Score: {fit_score}")

    if fit_score < settings.FIT_THRESHOLD_POOR:
        fit_decision = "poor_fit"
        reason = "Resume has very low overlap with core role requirements."
    elif fit_score < settings.FIT_THRESHOLD_PARTIAL:
        fit_decision = "partial_fit"
        reason = "Resume partially overlaps with role requirements; optimization may help."
    else:
        fit_decision = "good_fit"
        reason = "Resume already aligns with role requirements; optimization should improve competitiveness."

    fit_confidence = round(min(0.95, max(0.5, 0.5 + abs(fit_score - 0.35))), 2)

    decision = {
        "node": "fit_check",
        "action": "assessed_role_fit",
        "fit_decision": fit_decision,
        "fit_score": fit_score,
        "matched_required_count": len(matched_required),
        "required_count": len(required),
    }

    status = "rejected_poor_fit" if fit_decision == "poor_fit" else "processing"

    return {
        "fit_decision": fit_decision,
        "fit_reason": reason,
        "fit_confidence": fit_confidence,
        "status": status,
        "decision_log": state.get("decision_log", []) + [decision],
    }

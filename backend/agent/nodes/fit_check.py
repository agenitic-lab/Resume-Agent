import logging
import re
from typing import Dict, List
from config import settings
from .scoring import _strip_latex

logger = logging.getLogger(__name__)


def _ratio(matched: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return matched / total


def _normalize_list(values: List[str]) -> List[str]:
    return [str(v).strip().lower() for v in values if str(v).strip()]


def _word_boundary_match(term: str, text: str) -> bool:
    """Check if *term* appears in *text* as a whole word/phrase.

    Uses word-boundary regex so that 'java' does not match 'javascript',
    and 'go' does not match 'google'.  For terms with special characters
    (e.g. 'c++', 'c#', 'node.js') we escape them properly.
    """
    pattern = r'(?<![a-zA-Z0-9_.])' + re.escape(term) + r'(?![a-zA-Z0-9_])'
    return bool(re.search(pattern, text))


def assess_job_fit(state: Dict) -> Dict:
    """Check if the resume is a good match for the job.

    Uses keyword matching (no LLM needed) to save tokens.
    """
    requirements = state.get("job_requirements") or {}
    resume_raw = state.get("original_resume") or ""

    # Reuse the same thorough _strip_latex from scoring.py
    resume = _strip_latex(resume_raw).lower()

    required = _normalize_list(requirements.get("required_skills", []))
    preferred = _normalize_list(requirements.get("preferred_skills", []))
    keywords = _normalize_list(requirements.get("key_keywords", []))

    matched_required = [s for s in required if _word_boundary_match(s, resume)]
    matched_preferred = [s for s in preferred if _word_boundary_match(s, resume)]
    matched_keywords = [k for k in keywords if _word_boundary_match(k, resume)]

    required_ratio = _ratio(len(matched_required), len(required))
    keyword_ratio = _ratio(len(matched_keywords), len(keywords))
    preferred_ratio = _ratio(len(matched_preferred), len(preferred))

    fit_score = round((required_ratio * 0.6) + (keyword_ratio * 0.3) + (preferred_ratio * 0.1), 3)

    logger.info(
        "Fit check — required: %d/%d (%.2f), keywords: %d/%d (%.2f), "
        "preferred: %d/%d (%.2f), score: %.3f",
        len(matched_required), len(required), required_ratio,
        len(matched_keywords), len(keywords), keyword_ratio,
        len(matched_preferred), len(preferred), preferred_ratio,
        fit_score,
    )

    if fit_score < settings.FIT_THRESHOLD_POOR:
        fit_decision = "poor_fit"
        reason = "Resume has very low overlap with core role requirements."
    elif fit_score < settings.FIT_THRESHOLD_PARTIAL:
        fit_decision = "partial_fit"
        reason = "Resume partially overlaps with role requirements; optimization may help."
    else:
        fit_decision = "good_fit"
        reason = "Resume already aligns with role requirements; optimization should improve competitiveness."

    # Confidence is higher when the score is far from the decision boundaries.
    # Use the actual thresholds, not a hardcoded constant.
    poor_boundary = settings.FIT_THRESHOLD_POOR
    partial_boundary = settings.FIT_THRESHOLD_PARTIAL
    nearest_boundary = min(abs(fit_score - poor_boundary), abs(fit_score - partial_boundary))
    fit_confidence = round(min(0.95, 0.55 + nearest_boundary), 2)

    decision = {
        "node": "fit_check",
        "action": "assessed_role_fit",
        "fit_decision": fit_decision,
        "fit_score": fit_score,
        "matched_required_count": len(matched_required),
        "required_count": len(required),
        "detail": f"Job fit assessment: {fit_decision} (score: {fit_score:.2f}). "
                  f"Matched {len(matched_required)}/{len(required)} required skills, "
                  f"{len(matched_keywords)}/{len(keywords)} keywords. {reason}",
    }

    status = "rejected_poor_fit" if fit_decision == "poor_fit" else "processing"

    return {
        "fit_decision": fit_decision,
        "fit_reason": reason,
        "fit_confidence": fit_confidence,
        "status": status,
        "decision_log": state.get("decision_log", []) + [decision],
    }

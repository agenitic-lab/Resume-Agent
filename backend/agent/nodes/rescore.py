from typing import Dict
from .scoring import _score_resume_text


def rescore_modified_resume(state: Dict) -> Dict:
    modified_resume = state.get("modified_resume")

    if not modified_resume:
        return {
            "ats_score_after": None,
            "ats_breakdown_after": None,
            "improvement_delta": 0.0,
            "last_iteration_delta": 0.0,
        }

    ats_score_after, ats_breakdown_after = _score_resume_text(
        resume_text=modified_resume,
        requirements=state.get("job_requirements", {}),
    )

    ats_score_before = float(state.get("ats_score_before") or 0.0)

    existing_history = state.get("score_history", []) or []
    previous_score = existing_history[-1] if existing_history else ats_score_before
    updated_history = list(existing_history) + [ats_score_after]

    improvement_delta = round(ats_score_after - ats_score_before, 2)
    last_iteration_delta = round(ats_score_after - float(previous_score), 2)

    decision = {
        "node": "score_modified",
        "action": "scored_modified_resume",
        "score": ats_score_after,
        "delta_vs_previous": last_iteration_delta,
        "delta_vs_baseline": improvement_delta,
    }

    return {
        "ats_score_after": ats_score_after,
        "ats_breakdown_after": ats_breakdown_after,
        "improvement_delta": improvement_delta,
        "last_iteration_delta": last_iteration_delta,
        "iteration_count": int(state.get("iteration_count", 0)) + 1,
        "score_history": updated_history,
        "decision_log": state.get("decision_log", []) + [decision],
    }

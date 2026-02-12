from typing import Dict
from .scoring import score_resume


def rescore_modified_resume(state: Dict) -> Dict:
    modified_resume = state.get("modified_resume")

    if not modified_resume:
        return {"ats_score_after": None}

    temp_state = {
        "original_resume": modified_resume,
        "job_requirements": state.get("job_requirements", {})
    }

    score_result = score_resume(temp_state)
    ats_score_after = score_result["ats_score_before"]

    existing_history = state.get("score_history", []) or []
    updated_history = list(existing_history) + [ats_score_after]

    return {
        "ats_score_after": ats_score_after,
        "score_history": updated_history
    }
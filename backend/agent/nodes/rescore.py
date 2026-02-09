from typing import Dict
from scoring import score_resume

def rescore_modified_resume(state: Dict) -> Dict:
    modified_resume = state.get("modified_resume")
    
    if not modified_resume:
        return {
            "ats_score_after": None,
            "improvement_delta": None
        }
    
    temp_state = {
        "original_resume": modified_resume,
        "job_requirements": state.get("job_requirements", {})
    }
    
    score_result = score_resume(temp_state)
    ats_score_after = score_result["ats_score_before"]
    
    ats_score_before = state.get("ats_score_before", {})
    before_score = ats_score_before.get("score", 0) if isinstance(ats_score_before, dict) else 0
    after_score = ats_score_after.get("score", 0) if isinstance(ats_score_after, dict) else 0
    
    improvement_delta = round(after_score - before_score, 2)
    
    score_history = state.get("score_history", []) or []
    score_history.append(after_score)
    
    return {
        "ats_score_after": ats_score_after,
        "improvement_delta": improvement_delta,
        "score_history": score_history
    }
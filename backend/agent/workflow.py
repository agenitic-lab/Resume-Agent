"""
AG-24: Resume Optimization Agent Workflow

Connects all LangGraph nodes into a single end-to-end pipeline.

Flow (Sprint 1):
1. Extract Job Requirements
2. Analyze Resume
3. Score Original Resume
4. Plan Improvements
5. Modify Resume
6. Score Modified Resume
→ END
"""

import uuid
from langgraph.graph import StateGraph, END

from .state import ResumeAgentState, create_initial_state

# Nodes
from .nodes.job_requirements import extract_job_requirements
from .nodes.resume_analysis import analyze_resume
from .nodes.scoring import score_resume
from .nodes.planning import plan_improvements
from .nodes.modification import modify_resume
from .nodes.rescore import rescore_modified_resume


def create_agent_workflow():
    """
    Build and compile the LangGraph workflow.
    """
    graph = StateGraph(ResumeAgentState)

    # === Register nodes ===
    graph.add_node("extract_requirements", extract_job_requirements)
    graph.add_node("analyze_resume", analyze_resume)
    graph.add_node("score_initial", score_resume)
    graph.add_node("plan_improvements", plan_improvements)
    graph.add_node("modify_resume", modify_resume)
    graph.add_node("score_modified", rescore_modified_resume)

    # === Define execution order ===
    graph.set_entry_point("extract_requirements")

    graph.add_edge("extract_requirements", "analyze_resume")
    graph.add_edge("analyze_resume", "score_initial")
    graph.add_edge("score_initial", "plan_improvements")
    graph.add_edge("plan_improvements", "modify_resume")
    graph.add_edge("modify_resume", "score_modified")
    graph.add_edge("score_modified", END)

    return graph.compile()


# Compiled workflow instance
agent_app = create_agent_workflow()


def run_optimization(
    job_description: str,
    resume: str,
    user_id: str = "anonymous",
    run_id: str | None = None,
):
    """
    Convenience wrapper to run the workflow.
    """
    if run_id is None:
        run_id = str(uuid.uuid4())

    initial_state = create_initial_state(
        user_id=user_id,
        job_description=job_description,
        original_resume=resume,
    )

    result = agent_app.invoke(initial_state)
    result["final_status"] = "completed"

    return result

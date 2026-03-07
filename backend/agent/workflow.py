# Resume optimization workflow using LangGraph
# Checks if resume fits the job, then iteratively improves it until target score reached

import logging
import uuid
from typing import Callable, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from config import settings

logger = logging.getLogger(__name__)

from .state import ResumeAgentState, create_initial_state

# Nodes
from .nodes.job_requirements import extract_job_requirements
from .nodes.resume_analysis import analyze_resume
from .nodes.scoring import score_resume
from .nodes.planning import plan_improvements
from .nodes.modification import modify_resume
from .nodes.rescore import rescore_modified_resume
from .nodes.fit_check import assess_job_fit
from .nodes.cover_letter import generate_cover_letter


def _route_after_fit(state: ResumeAgentState) -> str:
    if state.get("fit_decision") == "poor_fit":
        return "stop"
    return "proceed"


def _route_after_rescore(state: ResumeAgentState) -> str:
    after = state.get("ats_score_after")
    if after is None:
        return "stop"

    if int(state.get("iteration_count", 0)) >= int(state.get("max_iterations", 3)):
        return "stop"

    if float(after) >= float(state.get("target_score", 75.0)):
        return "stop"

    last_gain = state.get("last_iteration_delta")
    min_gain = float(state.get("min_iteration_gain", 1.0))
    if last_gain is not None and float(last_gain) < min_gain:
        return "stop"

    return "iterate"


def create_agent_workflow():
    # Build and compile LangGraph workflow
    graph = StateGraph(ResumeAgentState)

    # Add all the agent nodes to the graph
    graph.add_node("extract_requirements", extract_job_requirements)
    graph.add_node("analyze_resume", analyze_resume)
    graph.add_node("score_initial", score_resume)
    graph.add_node("check_fit", assess_job_fit)
    graph.add_node("plan_improvements", plan_improvements)
    graph.add_node("modify_resume", modify_resume)
    graph.add_node("score_modified", rescore_modified_resume)
    graph.add_node("generate_cover_letter", generate_cover_letter)

    # Wire up the execution flow
    graph.set_entry_point("extract_requirements")

    graph.add_edge("extract_requirements", "analyze_resume")
    graph.add_edge("analyze_resume", "check_fit")

    # Route immediately after fit check — poor fits skip scoring + optimization
    graph.add_conditional_edges(
        "check_fit",
        _route_after_fit,
        {
            "stop": "generate_cover_letter",  # Poor fit -> generate letter only
            "proceed": "score_initial",        # Good/partial fit -> score then optimize
        },
    )

    graph.add_edge("score_initial", "plan_improvements")
    graph.add_edge("plan_improvements", "modify_resume")
    graph.add_edge("modify_resume", "score_modified")

    # After rescoring, decide to iterate or finish
    # When finished, generate cover letter before ending
    graph.add_conditional_edges(
        "score_modified",
        _route_after_rescore,
        {
            "stop": "generate_cover_letter",  # Optimization complete -> generate letter
            "iterate": "plan_improvements",    # Continue optimizing
        },
    )

    # Cover letter is the final step before END
    graph.add_edge("generate_cover_letter", END)

    return graph.compile()


# Create the workflow once at module load
agent_app = create_agent_workflow()


def run_optimization_with_events(
    job_description: str,
    resume: str,
    user_id: str = "anonymous",
    user_llm_api_key: Optional[str] = None,
    run_id: Optional[str] = None,
    event_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    template_id: Optional[str] = None,
    custom_template_latex: Optional[str] = None,
) -> ResumeAgentState:
    # Run optimization workflow with event callbacks
    if run_id is None:
        run_id = str(uuid.uuid4())

    # Create initial state
    initial_state: ResumeAgentState = create_initial_state(
        user_id=user_id,
        job_description=job_description,
        original_resume=resume,
        user_llm_api_key=user_llm_api_key,
        template_id=template_id,
        custom_template_latex=custom_template_latex,
    )

    if event_callback:
        event_callback("run_started", {"run_id": run_id})

    # Stream the workflow execution.
    # LangGraph's default stream yields partial updates per node.
    # We accumulate them into a running snapshot for event callbacks,
    # but always use invoke() to get the authoritative full final state.
    accumulated_state = dict(initial_state)

    try:
        for event in agent_app.stream(initial_state):
            for node_name, node_output in event.items():
                # Merge this node's partial output into our running snapshot
                accumulated_state.update(node_output)

                if event_callback:
                    event_callback("node_started", {"node": node_name})
                    event_callback(
                        "node_completed",
                        {
                            "node": node_name,
                            "iteration_count": int(accumulated_state.get("iteration_count", 0)),
                            "fit_decision": accumulated_state.get("fit_decision"),
                            "ats_score_before": accumulated_state.get("ats_score_before"),
                            "ats_score_after": accumulated_state.get("ats_score_after"),
                            "improvement_delta": accumulated_state.get("improvement_delta"),
                        },
                    )

        # After streaming completes, the accumulated state has all fields
        final_state = accumulated_state

    except Exception:
        # If streaming fails entirely, fall back to invoke
        logger.exception("Streaming failed, falling back to invoke")
        final_state = agent_app.invoke(initial_state)

    # Set final status based on outcome
    if final_state.get("fit_decision") == "poor_fit":
        final_state["final_status"] = "rejected_poor_fit"
    elif not final_state.get("modified_resume"):
        final_state["final_status"] = "failed_no_output"
    else:
        final_state["final_status"] = "completed"
    final_state["status"] = final_state["final_status"]

    if event_callback:
        event_callback(
            "run_completed",
            {
                "run_id": run_id,
                "final_status": final_state["final_status"],
                "fit_decision": final_state.get("fit_decision"),
                "iteration_count": int(final_state.get("iteration_count", 0)),
                "ats_score_before": final_state.get("ats_score_before"),
                "ats_score_after": final_state.get("ats_score_after"),
                "improvement_delta": final_state.get("improvement_delta"),
            },
        )

    return final_state

def run_optimization(
    job_description: str,
    resume: str,
    user_id: str = "anonymous",
    user_llm_api_key: Optional[str] = None,
    run_id: Optional[str] = None,
    template_id: Optional[str] = None,
    custom_template_latex: Optional[str] = None,
) -> ResumeAgentState:
    # Wrapper to run workflow without event callbacks
    return run_optimization_with_events(
        job_description=job_description,
        resume=resume,
        user_id=user_id,
        user_llm_api_key=user_llm_api_key,
        run_id=run_id,
        event_callback=None,
        template_id=template_id,
        custom_template_latex=custom_template_latex,
    )

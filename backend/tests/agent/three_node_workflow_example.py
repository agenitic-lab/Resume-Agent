from langgraph.graph import StateGraph, END
from state import ResumeAgentState
from nodes.job_requirements import extract_job_requirements
from nodes.resume_analysis import analyze_resume
from nodes.scoring import score_resume


def create_three_node_workflow():
    workflow = StateGraph(ResumeAgentState)
    
    workflow.add_node("extract_requirements", extract_job_requirements)
    workflow.add_node("analyze_resume", analyze_resume)
    workflow.add_node("score_resume", score_resume)
    
    workflow.set_entry_point("extract_requirements")
    workflow.add_edge("extract_requirements", "analyze_resume")
    workflow.add_edge("analyze_resume", "score_resume")
    workflow.add_edge("score_resume", END)
    
    return workflow.compile()


if __name__ == "__main__":
    from state import create_initial_state
    
    test_state = create_initial_state(
        user_id="user-456",
        job_description="""
        Senior Python Developer
        Requirements: 5+ years Python, Django, PostgreSQL
        """,
        original_resume="""
        John Doe
        Software Engineer
        Skills: Python, Flask, MySQL
        Experience: 3 years
        """
    )
    
    print("Running 3-node workflow...\n")
    
    app = create_three_node_workflow()
    result = app.invoke(test_state)
    
    print("=== Job Requirements ===")
    print(result["job_requirements"])
    
    print("\n=== Resume Analysis ===")
    print(result["resume_analysis"])
    
    print("\n=== ATS Score ===")
    print(f"Score: {result['ats_score_before']}/100")
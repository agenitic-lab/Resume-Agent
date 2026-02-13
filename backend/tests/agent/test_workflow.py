from langgraph.graph import StateGraph, END
from agent.state import ResumeAgentState, create_initial_state
from agent.nodes.job_requirements import extract_job_requirements


def build_test_workflow():
    workflow = StateGraph(ResumeAgentState)
    
    workflow.add_node("extract_requirements", extract_job_requirements)
    
    workflow.set_entry_point("extract_requirements")
    workflow.add_edge("extract_requirements", END)
    
    return workflow.compile()


def test_job_requirements_node():
    print("=== Testing Job Requirements Extraction Node ===\n")
    
    app = build_test_workflow()
    
    initial_state = create_initial_state(
        user_id="test-user-123",
        job_description="""
        Senior Backend Engineer - Python
        
        We are looking for an experienced backend engineer with:
        - 5+ years of Python development
        - Strong experience with Django and FastAPI
        - PostgreSQL database management
        - RESTful API design
        - Docker and Kubernetes knowledge
        - AWS cloud services experience
        
        Nice to have:
        - GraphQL experience
        - Redis caching
        - Microservices architecture
        """,
        original_resume="Sample resume content"
    )
    
    result = app.invoke(initial_state)
    
    print("Job Requirements Extracted:")
    print("-" * 50)
    requirements = result.get("job_requirements", {})
    print(f"Required Skills: {requirements.get('required_skills', [])}")
    print(f"Preferred Skills: {requirements.get('preferred_skills', [])}")
    print(f"Experience Years: {requirements.get('experience_years', 'N/A')}")
    print(f"Key Keywords: {requirements.get('key_keywords', [])}")
    print("\n✓ Workflow completed successfully!")


if __name__ == "__main__":
    test_job_requirements_node()
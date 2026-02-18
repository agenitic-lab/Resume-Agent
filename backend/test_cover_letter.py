"""
Test script for cover letter generation

This script tests the cover letter generation node in isolation.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.nodes.cover_letter import generate_cover_letter
from agent.state import create_initial_state


def test_cover_letter_generation():
    """Test that cover letter generation works correctly."""
    
    # Create a sample state
    job_description = """
    Software Engineer - Full Stack
    
    We're looking for an experienced Full Stack Developer with expertise in:
    - React and modern JavaScript
    - Python and FastAPI
    - PostgreSQL databases
    - RESTful API design
    - 3+ years of experience
    
    You'll be building scalable web applications and working with AI/ML integrations.
    """
    
    resume = """
    John Doe
    Full Stack Developer
    
    Experience:
    - 4 years building web applications with React and Python
    - Developed RESTful APIs using FastAPI
    - Worked with PostgreSQL and database optimization
    - Implemented AI features using LangChain
    
    Skills: React, Python, FastAPI, PostgreSQL, JavaScript, TypeScript, LangChain
    """
    
    state = create_initial_state(
        user_id="test-user",
        job_description=job_description,
        original_resume=resume,
        user_llm_api_key=None  # Will use default from env
    )
    
    # Simulate that resume was modified
    state['modified_resume'] = resume + "\n\nAdded: Experience with AI/ML integrations"
    
    print("Testing cover letter generation...")
    print("=" * 60)
    
    try:
        # Generate cover letter
        result = generate_cover_letter(state)
        
        if result.get('cover_letter'):
            print("\n✓ Cover letter generated successfully!\n")
            print("Cover Letter:")
            print("-" * 60)
            print(result['cover_letter'])
            print("-" * 60)
            print(f"\nLength: {len(result['cover_letter'])} characters")
            return True
        else:
            print("\n✗ Cover letter generation failed - no content returned")
            return False
            
    except Exception as e:
        print(f"\n✗ Error during cover letter generation: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_cover_letter_generation()
    sys.exit(0 if success else 1)

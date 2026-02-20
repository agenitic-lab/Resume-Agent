from .llm_client import build_groq_client
from config import settings
from langchain_core.messages import SystemMessage, HumanMessage


def generate_cover_letter(state):
    """Generate personalized cover letter from FINAL optimized resume and job description.
    
    This node runs ONLY after the resume optimization loop has finished.
    It does NOT affect the resume scoring or iteration logic.
    """
    print("---GENERATING COVER LETTER---")
    
    client = build_groq_client(state)
    
    # Use the 'modified_resume' if it exists (successful optimization), 
    # otherwise fall back to 'original_resume' (if fit check failed early)
    final_resume = state.get('modified_resume') or state['original_resume']
    
    prompt = f"""You are an expert career coach. Write a professional cover letter in standard business letter format.

JOB DESCRIPTION:
{state['job_description']}

CANDIDATE'S RESUME:
{final_resume}

INSTRUCTIONS:
Extract the following details from the resume and job description, then write a concise cover letter:

From Resume:
- Candidate's name
- Education/degree
- Key experience (internships/work/projects)
- Relevant skills
- Tools/technologies used
- 3 key strengths

From Job Description:
- Job title
- Company name (if mentioned)

FORMAT (EXACTLY):

Dear Hiring Manager,

[Opening paragraph: 2-3 sentences expressing interest in the [Job Title] role and briefly why you're a good fit]

[Experience paragraph: 2-3 sentences summarizing relevant experience, education, and skills that match the job requirements]

My key strengths include:
• [Strength 1 - specific and relevant to the job]
• [Strength 2 - specific and relevant to the job]
• [Strength 3 - specific and relevant to the job]

[Closing paragraph: 1-2 sentences stating resume is attached and providing contact information]
You can reach me at [Email from resume] or [Phone from resume].

Best regards,
[Candidate Name]

REQUIREMENTS:
- Total length: 120-150 words (excluding salutation and signature)
- Professional and concise tone
- Use actual details from the resume (do NOT invent information)
- Extract email and phone from resume if available
- If company name not in JD, use "your organization"
- Make strengths specific and relevant to the job requirements
- Use bullet points (•) for the 3 strengths

Write the cover letter now:"""
    
    try:
        response = client.chat.completions.create(
            model=settings.MODIFICATION_MODEL,  # Use same model as resume modification
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3  # Slightly creative but still professional
        )
        cover_letter_text = response.choices[0].message.content
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        cover_letter_text = None
    
    # Return ONLY the update to the state. 
    # This does NOT affect 'ats_score' or 'fit_decision'.
    return {"cover_letter": cover_letter_text}

import logging
from .llm_client import build_groq_client
from .scoring import _strip_latex
from config import settings

logger = logging.getLogger(__name__)


def generate_cover_letter(state):
    """Generate personalized cover letter from FINAL optimized resume and job description.

    This node runs ONLY after the resume optimization loop has finished.
    It does NOT affect the resume scoring or iteration logic.
    """
    logger.info("Generating cover letter")

    client = build_groq_client(state)

    # Use the 'modified_resume' if it exists (successful optimization),
    # otherwise fall back to 'original_resume' (if fit check failed early).
    # Strip LaTeX so the LLM sees clean text for name/contact extraction.
    raw_resume = state.get('modified_resume') or state['original_resume']
    final_resume = _strip_latex(raw_resume)

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
            model=settings.MODIFICATION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=settings.MAX_TOKENS,
        )
        cover_letter_text = response.choices[0].message.content
    except Exception:
        logger.exception("Error generating cover letter")
        cover_letter_text = None

    return {"cover_letter": cover_letter_text}

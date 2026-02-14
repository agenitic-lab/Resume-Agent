from typing import Dict
import json
from .llm_client import build_groq_client
from config import settings


def extract_job_requirements(state: Dict) -> Dict:
    client = build_groq_client(state)
    
    job_description = state["job_description"]
    
    prompt = f"""Extract structured requirements from this job description:

{job_description}

Return JSON with:
- required_skills: list of must-have skills
- preferred_skills: list of nice-to-have skills
- experience_years: minimum years required (number or null)
- key_keywords: important keywords for ATS (list)

Return ONLY valid JSON, no other text."""

    response = client.chat.completions.create(
        model=settings.JOB_REQUIREMENTS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    
    content = response.choices[0].message.content
    
    # Extract JSON from response (handle markdown code blocks)
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()
    
    requirements = json.loads(content)
    
    return {"job_requirements": requirements}

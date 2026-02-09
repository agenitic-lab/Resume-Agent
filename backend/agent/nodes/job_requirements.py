from typing import Dict
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()


def extract_job_requirements(state: Dict) -> Dict:
    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
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
        model="llama-3.3-70b-versatile",
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
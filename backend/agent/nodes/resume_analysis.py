from typing import Dict
from openai import OpenAI
from dotenv import load_dotenv
import json
import os

load_dotenv()


def analyze_resume(state: Dict) -> Dict:
    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
    resume = state["original_resume"]
    job_requirements = state["job_requirements"]
    
    prompt = f"""Analyze this resume against the job requirements.

Resume:
{resume}

Job Requirements:
{json.dumps(job_requirements, indent=2)}

Return JSON with:
- strengths: list of resume strengths matching the job
- weaknesses: list of areas where resume falls short
- missing_keywords: keywords present in requirements but missing in resume
- suggestions: specific improvements to make

Return ONLY valid JSON, no other text."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    
    content = response.choices[0].message.content
    
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()
    
    analysis = json.loads(content)
    
    return {"resume_analysis": analysis}
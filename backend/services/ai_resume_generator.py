from openai import OpenAI
import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def get_groq_client(api_key: str):
    if not api_key:
        logger.warning("No API key provided to get_groq_client")
        return None
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")


def _get_field_context(role: str) -> dict:
    """
    Returns field-specific context for prompt engineering based on the role.
    """
    role_lower = role.lower()

    if any(k in role_lower for k in ["developer", "engineer", "programmer", "devops", "cloud", "data", "ml", "ai", "sre"]):
        return {
            "field": "Technology / Software",
            "action_verbs": "Engineered, Developed, Architected, Optimized, Deployed, Automated, Refactored, Implemented",
            "focus": "technical implementation, system performance, scalability, code quality, and measurable engineering outcomes",
            "metric_style": "e.g., reduced latency by 40%, improved test coverage to 90%, deployed to 50k+ users",
        }
    elif any(k in role_lower for k in ["nurse", "doctor", "physician", "pharmacist", "therapist", "healthcare", "medical", "clinical", "dentist"]):
        return {
            "field": "Healthcare / Medical",
            "action_verbs": "Administered, Assessed, Coordinated, Monitored, Educated, Collaborated, Implemented, Managed",
            "focus": "patient care quality, clinical outcomes, safety protocols, and interdisciplinary collaboration",
            "metric_style": "e.g., managed care for 20+ patients daily, reduced medication errors by 15%, improved patient satisfaction scores",
        }
    elif any(k in role_lower for k in ["teacher", "professor", "educator", "instructor", "tutor", "counselor", "principal"]):
        return {
            "field": "Education",
            "action_verbs": "Developed, Facilitated, Mentored, Designed, Assessed, Implemented, Guided, Collaborated",
            "focus": "student outcomes, curriculum development, engagement strategies, and measurable academic improvement",
            "metric_style": "e.g., improved student pass rates by 25%, developed curriculum for 200+ students, led workshops for 30 teachers",
        }
    elif any(k in role_lower for k in ["marketing", "seo", "content", "brand", "social media", "digital"]):
        return {
            "field": "Marketing / Communications",
            "action_verbs": "Launched, Grew, Optimized, Managed, Developed, Executed, Increased, Drove",
            "focus": "campaign performance, audience growth, ROI, brand awareness, and lead generation",
            "metric_style": "e.g., grew social media following by 40%, increased conversion rate by 18%, managed $50k ad budget",
        }
    elif any(k in role_lower for k in ["sales", "account", "business development", "revenue"]):
        return {
            "field": "Sales / Business Development",
            "action_verbs": "Achieved, Exceeded, Negotiated, Closed, Prospected, Built, Managed, Generated",
            "focus": "revenue generation, quota attainment, client relationships, and pipeline management",
            "metric_style": "e.g., exceeded quarterly quota by 120%, closed $500k in new business, managed 50+ client accounts",
        }
    elif any(k in role_lower for k in ["manager", "director", "head", "lead", "vp", "chief", "operations"]):
        return {
            "field": "Management / Leadership",
            "action_verbs": "Led, Managed, Directed, Oversaw, Spearheaded, Streamlined, Mentored, Drove",
            "focus": "team leadership, operational efficiency, strategic initiatives, and business impact",
            "metric_style": "e.g., led a team of 15, reduced operational costs by 20%, delivered project 2 weeks ahead of schedule",
        }
    elif any(k in role_lower for k in ["designer", "ux", "ui", "graphic", "visual", "creative", "artist"]):
        return {
            "field": "Design / Creative",
            "action_verbs": "Designed, Created, Conceptualized, Developed, Produced, Collaborated, Delivered, Refined",
            "focus": "design quality, user experience, visual communication, and creative problem-solving",
            "metric_style": "e.g., redesigned onboarding flow increasing completion by 30%, delivered 50+ brand assets, led UX research with 100+ users",
        }
    elif any(k in role_lower for k in ["accountant", "finance", "financial", "auditor", "tax", "bookkeeper"]):
        return {
            "field": "Finance / Accounting",
            "action_verbs": "Managed, Analyzed, Prepared, Reconciled, Audited, Forecasted, Streamlined, Reported",
            "focus": "financial accuracy, compliance, cost savings, and reporting quality",
            "metric_style": "e.g., managed $2M budget, reduced reporting time by 30%, identified $100k in cost savings",
        }
    elif any(k in role_lower for k in ["lawyer", "attorney", "legal", "paralegal", "counsel", "compliance"]):
        return {
            "field": "Legal",
            "action_verbs": "Drafted, Negotiated, Advised, Represented, Researched, Reviewed, Managed, Litigated",
            "focus": "legal outcomes, risk mitigation, contract quality, and client representation",
            "metric_style": "e.g., successfully resolved 90% of cases, drafted 100+ contracts, reduced legal risk exposure by 25%",
        }
    elif any(k in role_lower for k in ["hr", "human resources", "recruiter", "talent", "people"]):
        return {
            "field": "Human Resources",
            "action_verbs": "Recruited, Developed, Implemented, Managed, Streamlined, Facilitated, Reduced, Improved",
            "focus": "talent acquisition, employee engagement, HR process efficiency, and retention",
            "metric_style": "e.g., reduced time-to-hire by 35%, onboarded 50+ employees, improved retention rate by 20%",
        }
    else:
        return {
            "field": "Professional",
            "action_verbs": "Managed, Developed, Implemented, Led, Improved, Delivered, Coordinated, Achieved",
            "focus": "professional impact, efficiency, collaboration, and measurable results",
            "metric_style": "e.g., improved process efficiency by 25%, managed cross-functional team of 10, delivered project on time and under budget",
        }


def generate_ats_bullets(role: str, technologies: List[str], keywords: List[str], api_key: str) -> List[str]:
    """
    Generates ATS-friendly bullet points for a specific role, tailored to the field.
    """
    client = get_groq_client(api_key)
    if not client:
        return ["Error: No API key provided or invalid. Cannot generate bullets."]

    ctx = _get_field_context(role)
    skills_str = ", ".join(technologies + keywords) if (technologies or keywords) else "core professional skills"

    prompt = f"""You are an expert RESUME WRITER specializing in ATS-optimized resumes for the {ctx['field']} field.
Write 4 high-impact resume bullet points for someone with the role: "{role}".

Field: {ctx['field']}
Skills/Tools: {skills_str}

Rules:
1. Return ONLY the bullet points, one per line. No dashes, bullets, or numbers.
2. Each bullet MUST start with a strong action verb from this list: {ctx['action_verbs']}
3. Focus on: {ctx['focus']}
4. Include quantifiable metrics where possible ({ctx['metric_style']})
5. Do NOT use markdown. No bold, no italics.
6. Keep each bullet to 1-2 lines, professional and concise.
7. Make each bullet UNIQUE — vary the structure and verb.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are a professional ATS resume writer specializing in {ctx['field']}. Output only plain text bullet points, one per line."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=350
        )
        content = response.choices[0].message.content
        bullets = [line.strip().strip("-•* ") for line in content.split("\n") if line.strip()]
        if not bullets:
            return ["Failed to generate bullets. Please try again."]
        return bullets[:5]
    except Exception as e:
        logger.error(f"Error generating bullets with Groq: {str(e)}")
        return [f"Error generating content: {str(e)}"]


def generate_ats_summary(
    current_role: str, 
    experience_level: str, 
    keywords: List[str], 
    api_key: str,
    experience: Optional[List[dict]] = None,
    projects: Optional[List[dict]] = None,
    education: Optional[List[dict]] = None,
    skills: Optional[List[str]] = None
) -> str:
    """
    Generates a professional summary tailored to the field, using all provided context.
    """
    client = get_groq_client(api_key)
    if not client:
        return "Error: No API key provided or invalid. Cannot generate summary."

    ctx = _get_field_context(current_role)
    keywords_str = ", ".join(keywords) if keywords else "core professional skills"
    
    # Format extra context for the prompt
    context_str = ""
    if experience:
        exp_pts = []
        for e in experience[:2]:
            company = e.get('company', 'Unknown Company')
            title = e.get('title', 'Unknown Role')
            details = "; ".join(e.get('details', [])[:2])
            exp_pts.append(f"- {title} at {company}: {details}")
        context_str += "\nExperience:\n" + "\n".join(exp_pts)
    
    if projects:
        proj_pts = []
        for p in projects[:2]:
            title = p.get('title', 'Unknown Project')
            details = "; ".join(p.get('details', [])[:1])
            proj_pts.append(f"- Project {title}: {details}")
        context_str += "\nProjects:\n" + "\n".join(proj_pts)
        
    if skills:
        context_str += f"\nSpecific Skills: {', '.join(skills)}"

    prompt = f"""You are an expert RESUME WRITER for the {ctx['field']} industry.
Write a powerful 3-4 sentence Professional Summary for a resume that highlights the candidate's unique value proposition.

Candidate Info:
- Target Role: {current_role}
- Experience Level: {experience_level}
- Primary Skills: {keywords_str}{context_str}

Rules:
1. Return ONLY the summary paragraph. No labels, no headers, no markdown.
2. Use strong, active language appropriate for the {ctx['field']} industry.
3. Focus on: {ctx['focus']}
4. Incorporate details from the experience and projects to make it specific, not generic.
5. Keep it between 50-80 words.
6. Avoid first-person pronouns ("I", "me"). Use "Results-driven [Role] with..." style.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are a professional resume writer specializing in {ctx['field']}. Output only a single paragraph summary based on the provided history."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=250
        )
        content = response.choices[0].message.content.strip()
        if content.startswith('"') and content.endswith('"'):
            content = content[1:-1]
        return content
    except Exception as e:
        logger.error(f"Error generating summary with Groq: {str(e)}")
        return f"Error generating summary: {str(e)}"


def generate_ats_project_bullets(project_name: str, project_type: str, role: str, technologies: List[str], keywords: List[str], api_key: str) -> List[str]:
    """
    Generates ATS-friendly bullet points for a project, tailored to the field and project type.
    """
    client = get_groq_client(api_key)
    if not client:
        return ["Error: No API key provided or invalid. Cannot generate bullets."]

    ctx = _get_field_context(role)
    skills_str = ", ".join(technologies + keywords) if (technologies or keywords) else "core professional skills"

    prompt = f"""You are an expert RESUME WRITER for the {ctx['field']} field.
Write 3 high-impact resume bullet points for a {project_type} project titled "{project_name}".

Context:
- Project Type: {project_type}
- Role: {role} ({ctx['field']})
- Tools/Skills: {skills_str}

Rules:
1. Return ONLY the bullet points, one per line. No dashes, bullets, or numbers.
2. Each bullet MUST start with a strong action verb from: {ctx['action_verbs']}
3. Focus on: {ctx['focus']}
4. Include impact/results ({ctx['metric_style']})
5. Do NOT use markdown. Keep it professional and concise.
6. Tailor the language to the {ctx['field']} field and the specific "{project_type}" project context.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are a professional ATS resume writer for the {ctx['field']} industry. Output only plain text bullet points."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=300
        )
        content = response.choices[0].message.content
        bullets = [line.strip().strip("-•* ") for line in content.split("\n") if line.strip()]
        if not bullets:
            return ["Failed to generate bullets. Please try again."]
        return bullets[:4]
    except Exception as e:
        logger.error(f"Error generating project bullets with Groq: {str(e)}")
        return [f"Error generating content: {str(e)}"]

import json

def analyze_resume_for_ats(
    resume_data: dict,
    api_key: str
) -> dict:
    """
    Analyzes a resume againstATS requirements and returns a JSON dict with score, keywords, and improvements.
    """
    client = get_groq_client(api_key)
    if not client:
        return {
            "score": 0,
            "score_label": "Needs Work",
            "strengths": ["None identified due to missing API key."],
            "weaknesses": ["Cannot analyze without a valid Groq API key."],
            "recommendations": [
                {
                    "issue": "API Key Missing",
                    "solution": "Go to Settings and add your Groq API key.",
                    "impact": "High",
                    "tags": ["System"]
                }
            ]
        }
    
    target_role = resume_data.get("field", "Professional")
    ctx = _get_field_context(target_role)
    
    prompt = f"""You are an expert ATS (Applicant Tracking System) parser and technical recruiter for the {ctx['field']} industry.
Evaluate the following resume data for a candidate aiming for a '{target_role}' role.

Resume Data:
{json.dumps(resume_data, indent=2)}

Provide your evaluation STRICTLY IN JSON format matching this exact schema:
{{
    "score": <integer from 0 to 100 based on keyword match, impact metrics, and clarity>,
    "score_label": <string, one of: "Needs Work", "Good", "Excellent">,
    "strengths": [<list of 3-5 specific strings highlighting what the resume does well>],
    "weaknesses": [<list of 3-5 specific strings highlighting areas for improvement, like missing summary, weak experience, etc>],
    "recommendations": [
        {{
            "issue": <string briefly describing the problem (e.g., "Missing professional summary")>,
            "solution": <string describing how to fix it (e.g., "Add a concise professional summary that outlines key skills")>,
            "impact": <string, one of: "High", "Medium", "Low">,
            "tags": [<list of 1-3 short strings like "T/ATS", "Formatting", "Content">]
        }}
    ]
}}

Ensure you provide at least 3-4 actionable recommendations. Do NOT wrap the JSON in markdown blocks (no ```json ... ```). Return ONLY the raw JSON string.
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You output only raw valid JSON arrays/objects."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        return {
            "score": data.get("score", 50),
            "score_label": data.get("score_label", "Needs Work"),
            "strengths": data.get("strengths", ["Has basic contact information."]),
            "weaknesses": data.get("weaknesses", ["Needs more detailed experience."]),
            "recommendations": data.get("recommendations", [])
        }
    except Exception as e:
        logger.error(f"Error analyzing resume with Groq: {str(e)}")
        return {
            "score": 40,
            "score_label": "Needs Work",
            "strengths": ["None identified due to error."],
            "weaknesses": ["Error analyzing resume.", str(e)],
            "recommendations": [
                {
                    "issue": "API Key Missing or Invalid",
                    "solution": "Please check your Groq API key in Settings.",
                    "impact": "High",
                    "tags": ["System", "Error"]
                }
            ]
        }


def apply_ai_optimizations(resume_data: dict, recommendations: list, api_key: str) -> dict:
    """
    Takes the original resume JSON and a list of selected recommendations to apply,
    returning a modified resume JSON.
    """
    client = get_groq_client(api_key)
    if not client:
        return resume_data
    
    target_role = resume_data.get("field", "Professional")
    ctx = _get_field_context(target_role)

    prompt = f"""You are an expert ATS resume optimizer for the {ctx['field']} industry.
The user wants to apply the following improvements to their resume:

SELECTED RECOMMENDATIONS TO APPLY:
{json.dumps(recommendations, indent=2)}

ORIGINAL RESUME DATA:
{json.dumps(resume_data, indent=2)}

Please seamlessly integrate the solutions into the resume data while STRICTLY adhering to the following rules:
1. ONLY ENHANCE EXISTING ENTRIES. Do NOT hallucinate, invent, or add new items to the `education`, `experience`, `projects`, or `custom_sections` arrays. The number of entries in these arrays must remain exactly the same.
2. If a recommendation suggests adding something you don't have information for, add a generalized statement based only on the existing context, but never invent fake degrees, companies, or job roles.
3. You may add relevant universally applicable technical skills or keywords to the `skills` array if it helps ATS optimization.
4. You may rewrite and expand bullet points and the professional summary to make them stronger and more impactful.
5. Ensure the tone remains highly professional and matches the target role '{target_role}'.

OUTPUT FORMAT:
Provide the fully updated resume data STRICTLY IN JSON format matching the original exact schema. 
Ensure ALL original sections (contact, education, skills, experience, projects, custom_sections) are preserved or enhanced, but never fabricated.
Do NOT wrap the JSON in markdown blocks. Return ONLY the raw JSON string.
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You output only raw valid JSON maintaining the exact original schema structure."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        return data
    except Exception as e:
        logger.error(f"Error applying optimizations with Groq: {str(e)}")
        return resume_data

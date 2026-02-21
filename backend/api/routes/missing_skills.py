# Missing Skills analysis endpoint
# Accepts a resume + list of JDs, returns deduplicated structured missing skills

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import asyncio
import json

from database.models import User
from auth.dependencies import get_current_user
from core.security import decrypt_api_key
from openai import OpenAI, RateLimitError, APIStatusError
from config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/api/agent", tags=["missing-skills"])

MAX_JDS = 20            # max JDs accepted in one request
MAX_JDS_PROCESSED = 10  # hard ceiling on LLM calls per request

# ── Groq rate-limit constants for llama-3.3-70b-versatile ─────────────────
# Source: https://console.groq.com/docs/rate-limits
GROQ_TPM_LIMIT = 12_000          # tokens per minute
GROQ_PROMPT_OVERHEAD = 300       # tokens for the static prompt template
GROQ_ESTIMATED_RESPONSE = 400    # estimated output tokens per call
INTER_REQUEST_SLEEP = 2.5        # seconds between calls (conservative throttle)
MAX_RETRY_ON_TPM = 1             # retries when TPM 429 hit (sleep then retry once)
# Daily limit is per-user key; free tier ~25-1000 RPD; we detect it at runtime


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)


def _is_daily_limit(exc: RateLimitError) -> bool:
    """
    Distinguish daily RPD exhaustion from per-minute TPM exhaustion.
    Groq sets retry-after > 3600 s for daily limits; small values for TPM.
    """
    try:
        retry_after = exc.response.headers.get("retry-after", "0")
        return int(float(retry_after)) > 3600
    except Exception:
        # Fall back: check the error message text
        msg = str(exc).lower()
        return "day" in msg or "daily" in msg or "per day" in msg


class MissingSkillsRequest(BaseModel):
    resume: str
    job_descriptions: List[str]


class SkillCategory(BaseModel):
    category: str
    skills: List[str]


class MissingSkillsResponse(BaseModel):
    missing_skills: List[SkillCategory]
    total_missing: int
    jds_analyzed: int
    jds_submitted: int
    jds_failed: int
    rate_limit_hit: bool
    rate_limit_type: Optional[str] = None   # "daily" | "tpm" | None
    warning: Optional[str] = None


@router.post("/missing-skills", response_model=MissingSkillsResponse)
async def find_missing_skills(
    request: MissingSkillsRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analyse multiple job descriptions against a single resume and return
    a deduplicated, structured list of skills the candidate is missing.
    Handles Groq rate limits (TPM=12K/min, RPD varies by plan) gracefully.

    Uses async def + asyncio.to_thread for blocking Groq calls so the event
    loop is never blocked and server shutdown/cancellation is always clean.
    """
    if not request.job_descriptions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one job description is required.",
        )

    if len(request.job_descriptions) > MAX_JDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_JDS} job descriptions allowed per request.",
        )

    if not request.resume.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text must not be empty.",
        )

    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set your Groq API key in Settings before using this feature.",
        )

    try:
        user_llm_api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored API key is invalid. Please re-save your API key in Settings.",
        )

    client = OpenAI(
        api_key=user_llm_api_key,
        base_url="https://api.groq.com/openai/v1",
    )

    # ── Token-budget-aware JD capping ─────────────────────────────────────
    # Each call sends: resume + JD + prompt overhead + expected response
    # We cap so we don't exceed GROQ_TPM_LIMIT in a single minute.
    resume_tokens = _estimate_tokens(request.resume)
    jds_to_process: List[str] = []
    token_budget_used = 0

    for jd in request.job_descriptions[:MAX_JDS_PROCESSED]:
        jd_tokens = _estimate_tokens(jd)
        call_tokens = resume_tokens + jd_tokens + GROQ_PROMPT_OVERHEAD + GROQ_ESTIMATED_RESPONSE
        if token_budget_used + call_tokens > GROQ_TPM_LIMIT and jds_to_process:
            # Adding this JD would likely exceed TPM; stop here for this minute
            break
        jds_to_process.append(jd)
        token_budget_used += call_tokens

    # Canonical category ordering
    CATEGORY_ORDER = [
        "Programming Languages",
        "Frameworks & Libraries",
        "Cloud & DevOps",
        "Databases",
        "Tools & Platforms",
        "Soft Skills & Concepts",
        "Other",
    ]

    category_map: dict[str, set] = {}
    jds_failed = 0
    rate_limit_hit = False
    rate_limit_type: Optional[str] = None
    warning: Optional[str] = None

    for idx, jd in enumerate(jds_to_process):
        prompt = f"""You are a technical recruiter. Compare the resume and job description below.
Identify skills, technologies, tools, or concepts that are mentioned in the JOB DESCRIPTION but are ABSENT from the RESUME.

RESUME:
{request.resume}

JOB DESCRIPTION:
{jd}

Return ONLY valid JSON with no extra text, following this exact structure:
{{
  "missing_skills": [
    {{"category": "Programming Languages", "skills": ["Python", "Go"]}},
    {{"category": "Frameworks & Libraries", "skills": ["FastAPI", "React"]}},
    {{"category": "Cloud & DevOps", "skills": ["AWS Lambda", "Kubernetes"]}},
    {{"category": "Databases", "skills": ["PostgreSQL", "Redis"]}},
    {{"category": "Tools & Platforms", "skills": ["Jira", "Figma"]}},
    {{"category": "Soft Skills & Concepts", "skills": ["Agile", "CI/CD"]}}
  ]
}}

Rules:
- Only include skills MISSING from the resume.
- Omit empty categories entirely.
- Normalise skill names (e.g. "javascript" -> "JavaScript").
- Use the category names exactly as shown above; use "Other" for anything that does not fit.
- Return only the JSON object."""

        success = False
        for attempt in range(MAX_RETRY_ON_TPM + 1):
            try:
                # Run blocking Groq call in a thread so the event loop stays free
                # and shutdown/cancellation works cleanly
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=settings.JOB_REQUIREMENTS_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                )

                content = response.choices[0].message.content.strip()

                # Strip markdown code fences if present
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()

                data = json.loads(content)
                for item in data.get("missing_skills", []):
                    cat = item.get("category", "Other").strip()
                    skills = item.get("skills", [])
                    if cat not in category_map:
                        category_map[cat] = set()
                    for skill in skills:
                        normalised = skill.strip()
                        if normalised:
                            category_map[cat].add(normalised)

                success = True
                break  # done with this JD

            except RateLimitError as exc:
                rate_limit_hit = True
                if _is_daily_limit(exc):
                    # Daily limit exhausted — no point retrying any more JDs
                    rate_limit_type = "daily"
                    warning = (
                        "Your Groq API key has reached its daily request limit "
                        "(free tier: ~25–1000 RPD depending on plan). "
                        "Results below are from the JDs analysed before the limit was hit. "
                        "Try again tomorrow or upgrade your Groq plan."
                    )
                    jds_failed += len(jds_to_process) - idx
                    # Return whatever we have so far
                    break
                else:
                    # TPM limit — wait for the retry-after window then try once more
                    rate_limit_type = "tpm"
                    try:
                        retry_after = float(
                            exc.response.headers.get("retry-after", "10")
                        )
                    except Exception:
                        retry_after = 10
                    retry_after = min(retry_after, 60)  # cap at 60s
                    if attempt < MAX_RETRY_ON_TPM:
                        print(
                            f"[missing_skills] TPM rate limit on JD {idx + 1}, "
                            f"sleeping {retry_after:.1f}s then retrying…"
                        )
                        await asyncio.sleep(retry_after)
                        continue
                    # Retry exhausted
                    warning = (
                        f"Groq token-per-minute limit (12K TPM) was hit. "
                        f"Processed {idx} of {len(jds_to_process)} JDs. "
                        "Try using shorter JDs or submit fewer at once."
                    )
                    jds_failed += 1
                    break

            except json.JSONDecodeError as exc:
                print(f"[missing_skills] JSON parse error for JD {idx + 1}: {exc}")
                jds_failed += 1
                break

            except APIStatusError as exc:
                print(f"[missing_skills] Groq API error for JD {idx + 1}: {exc}")
                jds_failed += 1
                break

            except Exception as exc:
                print(f"[missing_skills] Unexpected error for JD {idx + 1}: {exc}")
                jds_failed += 1
                break

        if not success and rate_limit_type == "daily":
            break  # abort remaining JDs on daily limit

        # Throttle between successful requests to avoid bursting into TPM limit
        if success and idx < len(jds_to_process) - 1:
            await asyncio.sleep(INTER_REQUEST_SLEEP)

    # ── Build sorted output ───────────────────────────────────────────────
    result: List[dict] = []
    remaining = {k: v for k, v in category_map.items() if k not in CATEGORY_ORDER}

    for cat in CATEGORY_ORDER:
        if cat in category_map and category_map[cat]:
            result.append({
                "category": cat,
                "skills": sorted(category_map[cat], key=str.lower),
            })

    for cat, skills in sorted(remaining.items()):
        if skills:
            result.append({
                "category": cat,
                "skills": sorted(skills, key=str.lower),
            })

    total = sum(len(item["skills"]) for item in result)
    jds_analyzed = len(jds_to_process) - jds_failed

    # Warn if we had to cap JDs due to token budget
    if len(request.job_descriptions) > len(jds_to_process) and not warning:
        warning = (
            f"Only {len(jds_to_process)} of {len(request.job_descriptions)} JDs were "
            f"processed to stay within Groq's 12K tokens-per-minute limit. "
            "Try shortening your JDs or submitting them in smaller batches."
        )

    return {
        "missing_skills": result,
        "total_missing": total,
        "jds_analyzed": jds_analyzed,
        "jds_submitted": len(request.job_descriptions),
        "jds_failed": jds_failed,
        "rate_limit_hit": rate_limit_hit,
        "rate_limit_type": rate_limit_type,
        "warning": warning,
    }

from typing import Dict
from openai import OpenAI
from config import settings


def build_groq_client(state: Dict) -> OpenAI:
    api_key = state.get("user_llm_api_key") or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("No LLM API key provided")
    return OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )

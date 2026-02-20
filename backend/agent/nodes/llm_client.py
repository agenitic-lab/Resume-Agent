from typing import Dict
from openai import OpenAI
from config import settings


def build_groq_client(state: Dict) -> OpenAI:
    api_key = state.get("user_llm_api_key")
    if not api_key:
        raise ValueError("User LLM API key not found in state. Please set it in Settings.")
    return OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )

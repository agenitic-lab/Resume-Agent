# All app config in one place - loaded from environment variables
import os
from typing import Optional


class Settings:
    # Load all settings from .env file
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/resume_agent"
    )
    
    # Auth & Security
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        "your-secret-key-here-change-in-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    ENCRYPTION_KEY: Optional[str] = os.getenv("ENCRYPTION_KEY")
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")
    ALLOWED_ORIGIN_REGEX: str = os.getenv(
        "ALLOWED_ORIGIN_REGEX",
        r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$"
    )
    
    # LLM settings
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    
    # Model names
    JOB_REQUIREMENTS_MODEL: str = os.getenv(
        "JOB_REQUIREMENTS_MODEL",
        "llama-3.3-70b-versatile"
    )
    RESUME_ANALYSIS_MODEL: str = os.getenv(
        "RESUME_ANALYSIS_MODEL",
        "llama-3.3-70b-versatile"
    )
    PLANNING_MODEL: str = os.getenv(
        "PLANNING_MODEL",
        "llama-3.3-70b-versatile"
    )
    MODIFICATION_MODEL: str = os.getenv(
        "MODIFICATION_MODEL",
        "llama-3.3-70b-versatile"
    )
    
    DEFAULT_TEMPERATURE: float = float(os.getenv("DEFAULT_TEMPERATURE", "0.2"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "4000"))
    
    # Agent tuning
    MAX_ITERATIONS: int = int(os.getenv("MAX_ITERATIONS", "3"))
    TARGET_SCORE: float = float(os.getenv("TARGET_SCORE", "75.0"))
    MIN_ITERATION_GAIN: float = float(os.getenv("MIN_ITERATION_GAIN", "1.0"))
    FIT_THRESHOLD_POOR: float = float(os.getenv("FIT_THRESHOLD_POOR", "0.25"))
    FIT_THRESHOLD_PARTIAL: float = float(os.getenv("FIT_THRESHOLD_PARTIAL", "0.45"))
    
    # External services
    LATEX_COMPILE_URL: str = os.getenv(
        "LATEX_COMPILE_URL",
        "https://latex.ytotech.com/builds/sync"
    )
    # LaTeX timeout reduced to 15s for better UX (external service is slow)
    LATEX_TIMEOUT: int = int(os.getenv("LATEX_TIMEOUT", "15"))
    
    # App info
    APP_NAME: str = "Resume Agent API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    @classmethod
    def get_allowed_origins_list(cls) -> list[str]:
        # Parse comma-separated ALLOWED_ORIGINS into a list
        origins = cls.ALLOWED_ORIGINS
        if not origins:
            return []
        return [origin.strip() for origin in origins.split(",") if origin.strip()]


# Singleton instance
settings = Settings()


# check settings are valid on startup
def validate_settings():
    errors = []
    
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "your-secret-key-here-change-in-production":
        errors.append("JWT_SECRET_KEY must be set to a secure value in production")
    
    if not settings.DATABASE_URL:
        errors.append("DATABASE_URL must be set")
    
    if not settings.ENCRYPTION_KEY:
        errors.append("ENCRYPTION_KEY must be set for encrypting user API keys")
    
    if errors and not settings.DEBUG:
        raise ValueError(f"Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))
    
    return True


if __name__ == "__main__":
    # Test configuration loading
    print("=== Resume Agent Configuration ===\n")
    print(f"App Name: {settings.APP_NAME}")
    print(f"Version: {settings.APP_VERSION}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Database: {settings.DATABASE_URL[:30]}...")
    print(f"Planning Model: {settings.PLANNING_MODEL}")
    print(f"LaTeX Timeout: {settings.LATEX_TIMEOUT}s")
    print(f"Max Iterations: {settings.MAX_ITERATIONS}")
    print(f"Target Score: {settings.TARGET_SCORE}")
    print("\nValidating settings...")
    try:
        validate_settings()
        print("✓ Configuration valid")
    except ValueError as e:
        print(f"✗ Configuration errors:\n{e}")

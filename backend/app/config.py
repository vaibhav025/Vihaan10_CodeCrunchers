from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SixtyFy"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./pensionquest.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL_SECONDS: int = 3600

    # JWT
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    AUTH_COOKIE_NAME: str = "pq_session"

    # AI
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_URL: str = ""  # e.g. http://localhost:11434 — fully local, nothing leaves the server
    AI_PROVIDER: str = "gemini"  # tried first; the others are automatic fallbacks
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_MODEL: str = "llama3.2"

    # Prune AI gateway (withprune.com). When a key is set, AI requests go through Prune,
    # which screens them (prompt injection, personal data, secrets, spend caps) before
    # forwarding to the provider whose key is saved in the Prune dashboard.
    PRUNE_API_KEY: str = ""
    PRUNE_BASE_URL: str = "https://api.withprune.com/v1"
    PRUNE_MODEL: str = "gemini-2.5-flash"  # must match a provider connected in the Prune dashboard
    PRUNE_CACHE: str = "exact"  # off | exact | normalized | semantic
    # True: with Prune configured, never call a provider directly; if Prune refuses or is down,
    # the built-in engine answers instead. False: fall back to the direct providers above.
    PRUNE_STRICT: bool = True

    # Google Translate
    GOOGLE_TRANSLATE_API_KEY: str = ""

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-service-account.json"

    # Encryption
    DATA_ENCRYPTION_KEY: str = ""
    NPS_ANNUITY_SHARE: float = Field(default=0.20, ge=0, le=1)

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

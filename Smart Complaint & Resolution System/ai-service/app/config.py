from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore" # Ignore extra keys
    )

    PORT: int = 8000
    MONGODB_URL: str = "mongodb://localhost:27017/"
    MONGO_DB_NAME: str = "smart_complaint_resolution"

    SECRET_KEY: str = "fallback_secret_key_for_ai_service"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    GEMINI_API_KEY: Optional[str] = None

settings = Settings()

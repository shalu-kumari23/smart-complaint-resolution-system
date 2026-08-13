from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
    )

    # -------------------------
    # DATABASE
    # -------------------------
    MONGODB_URL: str
    MONGO_DB_NAME: str

    # -------------------------
    # AUTH
    # -------------------------
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # -------------------------
    # EMAIL (optional)
    # -------------------------
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None

    # -------------------------
    # MLFLOW / DAGSHUB (optional)
    # -------------------------
    DAGSHUB_REPO_OWNER: str | None = None
    DAGSHUB_REPO_NAME: str | None = None

settings = Settings() #type: ignore

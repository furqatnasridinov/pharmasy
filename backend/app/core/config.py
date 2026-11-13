"""Настройки приложения. Все значения можно переопределить через .env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    JWT_ALGORITHM: str = "HS256"

    DATABASE_URL: str = "sqlite:///./data/pharmacy.db"
    UPLOAD_DIR: str = "./data/uploads"
    STATIC_DIR: str = "./static"  # собранный React (в Docker)

    EXPIRY_WARNING_DAYS: int = 30
    LOW_STOCK_THRESHOLD: int = 5
    MAX_UPLOAD_MB: int = 5

    ADMIN_EMAIL: str = "admin@pharmacy.local"
    ADMIN_PASSWORD: str = "admin123"

    @property
    def upload_path(self) -> Path:
        return Path(self.UPLOAD_DIR)

    @property
    def sqlite_file(self) -> Path | None:
        prefix = "sqlite:///"
        if self.DATABASE_URL.startswith(prefix):
            return Path(self.DATABASE_URL[len(prefix):])
        return None


settings = Settings()

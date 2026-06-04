from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://anima:anima_secret@localhost:5432/anima_hr"

    # Security
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None

    # Company
    COMPANY_NAME: str = "Mi Empresa SpA"
    COMPANY_RUT: str = "76.000.000-0"
    COMPANY_ADDRESS: str = "Santiago, Chile"
    COMPANY_PHONE: str = "+56 2 2000 0000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

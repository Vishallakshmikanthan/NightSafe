from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    env: str = "development"
    secret_key: str = "change-me"
    database_url: str = "sqlite:///./nightsafe.db"
    google_maps_api_key: str = ""
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
    ]
    # Set FRONTEND_URL env var in production (e.g. https://nightsafe.vercel.app)
    frontend_url: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Dynamically add production frontend URL to CORS if set
if settings.frontend_url:
    settings.allowed_origins.append(settings.frontend_url)

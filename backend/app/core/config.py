from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    env: str = "development"
    secret_key: str = "change-me"
    database_url: str = "sqlite:///./nightsafe.db"
    google_maps_api_key: str = ""
    # Store origins as a raw string to avoid Pydantic's JSON parsing errors for lists in .env
    allowed_origins_raw: str = "http://localhost:5173,http://localhost:4173"
    # Set FRONTEND_URL env var in production (e.g. https://nightsafe.vercel.app)
    frontend_url: str = ""

    @property
    def allowed_origins(self) -> List[str]:
        origins = [i.strip() for i in self.allowed_origins_raw.split(",") if i.strip()]
        if self.frontend_url:
            origins.append(self.frontend_url)
        return origins

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "env_prefix": "",
    }


settings = Settings()

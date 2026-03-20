from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    env: str = "development"
    secret_key: str = "change-me"
    database_url: str = "sqlite:///./nightsafe.db"
    google_maps_api_key: str = ""
    allowed_origins: List[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

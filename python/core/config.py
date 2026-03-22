from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4"
    
    class Config:
        env_prefix = ""
        env_file = ".env"
        extra = "ignore"

    @classmethod
    def from_config(cls, api_key: str, base_url: str, model: str) -> "Settings":
        return cls(
            openai_api_key=api_key,
            openai_base_url=base_url or "https://api.openai.com/v1",
            openai_model=model or "gpt-4",
        )


settings = Settings()
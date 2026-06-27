from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = ""
    next_public_api_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = ""


def _load_env() -> str:
    """Carga DATABASE_URL desde el .env de la raiz del monorepo o de api/."""
    import os
    candidates = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for env_path in candidates:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.getenv("DATABASE_URL", "")


@lru_cache
def get_settings() -> Settings:
    db_url = _load_env()
    return Settings(database_url=db_url)
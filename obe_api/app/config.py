import os
from glob import glob
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from functools import lru_cache


def _resolve_vfstr_template_path() -> str:
    env_path = os.getenv("VFSTR_TEMPLATE_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    home = Path.home()
    candidate_paths = [
        home / "Downloads" / "R22 Attainment Template-unprotected_11.5-2025 (2).xlsx",
        home / "Downloads" / "R22 Attainment Template-unprotected_11.5-2025.xlsx",
        home / "Downloads" / "R22 Attainment Template.xlsx",
    ]
    for candidate in candidate_paths:
        if candidate.exists():
            return str(candidate)

    download_matches = sorted(
        glob(str(home / "Downloads" / "R22 Attainment Template*.xlsx")),
        reverse=True,
    )
    if download_matches:
        return download_matches[0]

    legacy_paths = [
        (
            r"C:\Users\prade\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
            r"\LocalState\sessions\6F7CC58FE5E6F0BA4A900AAD544900BB60924C73\transfers\2026-17"
            r"\R22 Attainment Template-unprotected_11.5-2025 (2).xlsx"
        ),
    ]
    for candidate in legacy_paths:
        if os.path.exists(candidate):
            return candidate

    return str(candidate_paths[0])


class Settings(BaseSettings):
    # AI
    # Set `GROQ_API_KEY` in your environment or in `.env` (do NOT commit secrets).
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"

    # MongoDB
    # Set `MONGODB_URL` in your environment or in `.env`.
    mongodb_url: str = os.getenv("MONGODB_URL", "")
    mongodb_db: str = "obe_system"

    # App
    app_secret_key: str = os.getenv("APP_SECRET_KEY", "change-me")
    upload_dir: str = "uploads"
    output_dir: str = "outputs"
    max_upload_mb: int = 50
    vfstr_template_path: str = _resolve_vfstr_template_path()

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

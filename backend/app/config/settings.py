from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Meeting Hotspot Backend"
    environment: str = Field("development", alias="ENVIRONMENT")
    database_url: str = Field(
        "sqlite+aiosqlite:///./meeting_hotspot.db",
        alias="DATABASE_URL",
    )
    hotspot_interface: str = Field("wlan0", alias="HOTSPOT_INTERFACE")
    meeting_threshold: int = Field(3, alias="MEETING_THRESHOLD")
    meeting_window_minutes: int = Field(5, alias="MEETING_WINDOW_MINUTES")
    poll_interval_seconds: int = Field(10, alias="POLL_INTERVAL_SECONDS")
    history_limit: int = Field(10, alias="HISTORY_LIMIT")
    polling_enabled: bool = Field(False, alias="POLLING_ENABLED")

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

from pathlib import Path
from typing import Optional

from alembic import command
from alembic.config import Config as AlembicConfig
from sqlalchemy.engine import Engine

from app.config import settings


def _alembic_config() -> AlembicConfig:
    root = Path(__file__).resolve().parent.parent
    config = AlembicConfig(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    return config


def run_migrations(engine: Optional[Engine] = None, revision: str = "head") -> None:
    """Apply migrations up to the given revision."""
    config = _alembic_config()

    if engine is not None:
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, revision)
        return

    command.upgrade(config, revision)


def run_migrations_on_startup(app: object | None = None) -> None:
    """Litestar startup hook to ensure schema is up to date."""
    run_migrations()


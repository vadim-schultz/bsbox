from __future__ import annotations

from pathlib import Path

from alembic.config import Config as AlembicConfig
from sqlalchemy.engine import Engine

from alembic import command
from app.config import settings
from app.models.base import Base


def _find_alembic_dir() -> Path | None:
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "alembic",
        Path.cwd() / "alembic",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _find_alembic_ini(alembic_dir: Path | None) -> Path | None:
    if alembic_dir:
        ini = alembic_dir.parent / "alembic.ini"
        if ini.exists():
            return ini
    return None


def _alembic_config() -> AlembicConfig | None:
    alembic_dir = _find_alembic_dir()
    ini_path = _find_alembic_ini(alembic_dir)
    if not alembic_dir or not ini_path:
        return None
    config = AlembicConfig(str(ini_path))
    config.set_main_option("script_location", str(alembic_dir))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    return config


def run_migrations(engine: Engine | None = None, revision: str = "head") -> None:
    """Apply migrations up to the given revision.

    Falls back to metadata.create_all when alembic assets are unavailable
    (e.g., in an installed package without migration files).
    """

    config = _alembic_config()
    if config is None:
        if engine is not None:
            Base.metadata.create_all(engine)
        return

    if engine is not None:
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, revision)
        return

    command.upgrade(config, revision)


def run_migrations_on_startup(app: object | None = None) -> None:
    """Litestar startup hook to ensure schema is up to date."""
    run_migrations()

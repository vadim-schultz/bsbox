"""Database dialect utilities for multi-database support."""

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.config import settings


def get_dialect() -> str:
    """Detect database dialect from DATABASE_URL."""
    url = settings.database_url.lower()
    if url.startswith("postgresql"):
        return "postgresql"
    return "sqlite"


def dialect_insert(table):
    """Return dialect-specific insert statement for the configured database."""
    if get_dialect() == "postgresql":
        return pg_insert(table)
    return sqlite_insert(table)

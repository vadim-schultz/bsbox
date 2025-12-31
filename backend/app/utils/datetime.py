"""UTC-centric datetime helpers."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime, tzinfo

logger = logging.getLogger(__name__)


def ensure_utc(dt: datetime, *, on_naive: Callable[[datetime], datetime] | None = None) -> datetime:
    """Return a UTC-aware datetime.

    - If tzinfo is missing, apply ``on_naive`` (defaults to assuming UTC).
    - Always returns an aware datetime with UTC tzinfo.
    """
    if dt.tzinfo is None:
        if on_naive:
            dt = on_naive(dt)
        else:
            logger.warning("ensure_utc received naive datetime; assuming UTC")
            dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def ensure_tz(dt: datetime, tz: tzinfo) -> datetime:
    """Ensure datetime is aware in the provided timezone."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def isoformat_utc(dt: datetime) -> str:
    """ISO 8601 string in UTC with trailing 'Z'."""
    return ensure_utc(dt).isoformat().replace("+00:00", "Z")

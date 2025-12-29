"""Pydantic models for MS Teams meeting data."""

import re
import urllib.parse
from functools import cached_property

from pydantic import BaseModel, ConfigDict, PrivateAttr, computed_field

_OLD_URL_PATTERN = re.compile(r"meetup-join/(?P<thread_enc>[^/]+)/\d+")
_NEW_URL_PATTERN = re.compile(r"/meet/(?P<meeting_id>[^?]+)")
_NUMERIC_PATTERN = re.compile(r"^\d[\d\s]+\d$")


class ParsedTeamsMeeting(BaseModel):
    """Parsed MS Teams meeting identifiers.

    Use `from_string()` to construct from a raw URL or numeric meeting ID.
    Each field lazily parses what it needs from the stored raw input.
    """

    model_config = ConfigDict(frozen=True)

    _raw_input: str = PrivateAttr(default="")

    @classmethod
    def from_string(cls, value: str | None) -> "ParsedTeamsMeeting":
        """Construct from a raw input string (URL or numeric meeting ID)."""
        instance = cls()
        object.__setattr__(instance, "_raw_input", (value or "").strip())
        return instance

    @cached_property
    def _normalized(self) -> str:
        """Trimmed raw input for parsing."""
        return self._raw_input

    @computed_field
    @cached_property
    def thread_id(self) -> str | None:
        """Extract thread ID from old-style Teams URL."""
        if not self._normalized:
            return None
        if self._normalized.lower().startswith(("http://", "https://")):
            match = _OLD_URL_PATTERN.search(self._normalized)
            if match:
                return urllib.parse.unquote(match.group("thread_enc"))
        return None

    @computed_field
    @cached_property
    def meeting_id(self) -> str | None:
        """Extract meeting ID from new-style URL or numeric input."""
        if not self._normalized:
            return None

        # Numeric meeting ID (e.g., "385 562 023 120 47")
        if _NUMERIC_PATTERN.match(self._normalized):
            return self._normalized.replace(" ", "")

        # New URL format
        if self._normalized.lower().startswith(("http://", "https://")):
            match = _NEW_URL_PATTERN.search(self._normalized)
            if match:
                return match.group("meeting_id")

        return None

    @computed_field
    @cached_property
    def invite_url(self) -> str | None:
        """Return the raw URL if input was a URL, None otherwise."""
        if not self._normalized:
            return None

        # URLs are preserved as invite_url
        if self._normalized.lower().startswith(("http://", "https://")):
            return self._normalized

        # Numeric IDs don't have an invite URL
        if _NUMERIC_PATTERN.match(self._normalized):
            return None

        # Unrecognized format - store as-is (fallback)
        return self._normalized

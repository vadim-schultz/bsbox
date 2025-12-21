import re
import urllib.parse
from typing import TypedDict


class ParsedTeamsMeeting(TypedDict):
    thread_id: str | None
    meeting_id: str | None
    raw_url: str | None


_OLD_URL_PATTERN = re.compile(r"meetup-join/(?P<thread_enc>[^/]+)/\d+")
_NEW_URL_PATTERN = re.compile(r"/meet/(?P<meeting_id>[^?]+)")
_NUMERIC_PATTERN = re.compile(r"^\d[\d\s]+\d$")


def parse_teams_meeting(input_str: str | None) -> ParsedTeamsMeeting:
    """Parse a Teams invite URL or meeting ID and extract identifiers.

    Returns a mapping with `thread_id`, `meeting_id`, and `raw_url`.
    Unknown or invalid inputs return `None` fields.
    """
    if not input_str:
        return {"thread_id": None, "meeting_id": None, "raw_url": None}

    value = input_str.strip()
    if not value:
        return {"thread_id": None, "meeting_id": None, "raw_url": None}

    # Numeric meeting ID input (e.g., "385 562 023 120 47")
    if _NUMERIC_PATTERN.match(value):
        cleaned_meeting_id = value.replace(" ", "")
        return {"thread_id": None, "meeting_id": cleaned_meeting_id, "raw_url": None}

    # URL inputs
    if value.lower().startswith(("http://", "https://")):
        old_match = _OLD_URL_PATTERN.search(value)
        if old_match:
            encoded = old_match.group("thread_enc")
            thread_id = urllib.parse.unquote(encoded)
            return {"thread_id": thread_id, "meeting_id": None, "raw_url": value}

        new_match = _NEW_URL_PATTERN.search(value)
        if new_match:
            meeting_id = new_match.group("meeting_id")
            return {"thread_id": None, "meeting_id": meeting_id, "raw_url": value}

    # Unrecognized format
    return {"thread_id": None, "meeting_id": None, "raw_url": value if value else None}

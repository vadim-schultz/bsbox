"""Integration schemas for third-party services."""

from app.schema.integration.models import MSTeamsMeetingRead
from app.schema.integration.parsers import ParsedTeamsMeeting

__all__ = [
    "MSTeamsMeetingRead",
    "ParsedTeamsMeeting",
]

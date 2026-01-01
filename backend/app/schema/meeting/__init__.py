"""Meeting schemas."""

from app.schema.meeting.models import MeetingRead, MeetingWithParticipants
from app.schema.meeting.requests import MeetingDurationUpdate

__all__ = [
    "MeetingRead",
    "MeetingWithParticipants",
    "MeetingDurationUpdate",
]

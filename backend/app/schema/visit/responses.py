"""Visit response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.utils.datetime import isoformat_utc


class VisitResponse(BaseModel):
    """Response from a successful visit request.

    Contains meeting identifiers and time bounds.
    Participant ID is no longer included - it comes from WebSocket join.
    """

    model_config = ConfigDict(from_attributes=True)

    meeting_id: str
    meeting_start: datetime
    meeting_end: datetime

    @field_serializer("meeting_start", "meeting_end")
    def serialize_meeting_bounds(self, dt: datetime) -> str:
        return isoformat_utc(dt)

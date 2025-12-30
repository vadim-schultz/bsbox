"""Visit-related schemas for meeting discovery.

The visit endpoint returns meeting info. Participant creation happens via WebSocket.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.schema.teams import ParsedTeamsMeeting


class VisitRequest(BaseModel):
    """Request to find or create a meeting for the current time slot.

    If no meeting exists for the given context (city/room/Teams), a new one is created.
    Participant creation happens via WebSocket join, not here.
    """

    city_id: str | None = None
    meeting_room_id: str | None = None
    ms_teams_input: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ms_teams(self) -> ParsedTeamsMeeting:
        """Parse ms_teams_input into structured Teams meeting identifiers."""
        return ParsedTeamsMeeting.from_string(self.ms_teams_input)


class VisitResponse(BaseModel):
    """Response from a successful visit request.

    Contains meeting identifiers and time bounds.
    Participant ID is no longer included - it comes from WebSocket join.
    """

    model_config = ConfigDict(from_attributes=True)

    meeting_id: str
    meeting_start: datetime
    meeting_end: datetime

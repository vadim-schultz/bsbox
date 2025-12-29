"""Visit-related schemas for participant session management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schema.teams import ParsedTeamsMeeting


class VisitRequest(BaseModel):
    """Request to register a participant visit to a meeting.

    Creates or joins a meeting session and returns participant credentials.
    If no meeting exists for the given context (city/room/Teams), a new one is created.
    """

    device_fingerprint: str = Field(
        ..., description="Device/browser fingerprint for identifying returning visitor"
    )
    city_id: str | None = None
    meeting_room_id: str | None = None
    ms_teams_input: str | None = None

    @computed_field
    @property
    def ms_teams(self) -> ParsedTeamsMeeting:
        """Parse ms_teams_input into structured Teams meeting identifiers."""
        return ParsedTeamsMeeting.from_string(self.ms_teams_input)


class VisitResponse(BaseModel):
    """Response from a successful visit request.

    Contains meeting and participant identifiers along with meeting time bounds.
    """

    model_config = ConfigDict(from_attributes=True)

    meeting_id: str
    participant_id: str
    meeting_start: datetime
    meeting_end: datetime

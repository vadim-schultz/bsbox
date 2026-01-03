"""Visit request schemas for meeting discovery."""

from pydantic import BaseModel, Field, computed_field, field_validator

from app.schema.integration.parsers import ParsedTeamsMeeting


class VisitRequest(BaseModel):
    """Request to find or create a meeting for the current time slot.

    If no meeting exists for the given context (city/room/Teams), a new one is created.
    Participant creation happens via WebSocket join, not here.
    """

    city_id: str | None = None
    meeting_room_id: str | None = None
    ms_teams_input: str | None = None
    duration_minutes: int = Field(default=60, description="Meeting duration in minutes (30 or 60)")

    @field_validator("duration_minutes")
    @classmethod
    def _validate_duration(cls, value: int) -> int:
        if value not in {30, 60}:
            raise ValueError("duration_minutes must be 30 or 60")
        return value

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ms_teams(self) -> ParsedTeamsMeeting:
        """Parse ms_teams_input into structured Teams meeting identifiers."""
        return ParsedTeamsMeeting.from_string(self.ms_teams_input)

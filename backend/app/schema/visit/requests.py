"""Visit request schemas for meeting discovery."""

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

from app.schema.integration.parsers import ParsedTeamsMeeting


class VisitRequest(BaseModel):
    """Request to find or create a meeting for the current time slot.

    If no meeting exists for the given context (city/room/Teams), a new one is created.
    Participant creation happens via WebSocket join, not here.

    Requires either:
    - ms_teams_input (Teams link/ID) - primary identifier, OR
    - meeting_room_id (meeting room) - secondary identifier

    City alone is not sufficient; at least one of the above is required.
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

    @model_validator(mode="after")
    def _validate_meeting_context(self) -> "VisitRequest":
        """Validate that either Teams link/ID or meeting room is provided."""
        has_teams = self.ms_teams_input and self.ms_teams_input.strip()
        has_room = self.meeting_room_id and self.meeting_room_id.strip()

        if not has_teams and not has_room:
            raise ValueError(
                "Meeting must have either a Teams link/ID (ms_teams_input) or a meeting room "
                "(meeting_room_id). City alone is not sufficient."
            )

        return self

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ms_teams(self) -> ParsedTeamsMeeting:
        """Parse ms_teams_input into structured Teams meeting identifiers."""
        return ParsedTeamsMeeting.from_string(self.ms_teams_input)

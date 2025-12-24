from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schema.participant import ParticipantRead


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    start_ts: datetime
    end_ts: datetime
    city_id: str | None = None
    city_name: str | None = None
    meeting_room_id: str | None = None
    meeting_room_name: str | None = None
    ms_teams_thread_id: str | None = None
    ms_teams_meeting_id: str | None = None
    ms_teams_invite_url: str | None = None


class MeetingDurationUpdate(BaseModel):
    duration_minutes: int = Field(..., description="Allowed values: 30 or 60")

    @field_validator("duration_minutes")
    @classmethod
    def _validate_duration(cls, value: int) -> int:
        if value not in {30, 60}:
            raise ValueError("duration_minutes must be 30 or 60")
        return value


class MeetingWithParticipants(MeetingRead):
    participants: list[ParticipantRead] = Field(default_factory=list)

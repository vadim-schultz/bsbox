from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schema.participant import ParticipantRead


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    start_ts: datetime
    end_ts: datetime


class MeetingDurationUpdate(BaseModel):
    duration_minutes: int = Field(..., description="Allowed values: 30 or 60")

    @field_validator("duration_minutes")
    @classmethod
    def _validate_duration(cls, value: int) -> int:
        if value not in {30, 60}:
            raise ValueError("duration_minutes must be 30 or 60")
        return value


class MeetingWithParticipants(MeetingRead):
    participants: List[ParticipantRead] = Field(default_factory=list)


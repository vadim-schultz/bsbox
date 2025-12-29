"""Participant-related schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.engagement import EngagementSampleRead

StatusLiteral = Literal["speaking", "engaged", "disengaged"]


class ParticipantRead(BaseModel):
    """Read schema for a meeting participant with their engagement history."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    device_fingerprint: str
    last_status: str | None = None
    engagement_samples: list[EngagementSampleRead] = Field(default_factory=list)


class ParticipantCreate(BaseModel):
    """Schema for creating a new participant in a meeting."""

    meeting_id: str
    device_fingerprint: str = ""


class StatusChangeRequest(BaseModel):
    """Request to change a participant's engagement status."""

    meeting_id: str = Field(..., description="Target meeting id")
    participant_id: str | None = Field(None, description="Existing participant id, if any")
    status: StatusLiteral = Field(..., description="Participant status")

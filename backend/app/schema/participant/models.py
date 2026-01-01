"""Participant model schemas for API responses."""

from pydantic import BaseModel, ConfigDict, Field

from app.schema.engagement.models import EngagementSampleRead


class ParticipantRead(BaseModel):
    """Read schema for a meeting participant with their engagement history."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    device_fingerprint: str
    last_status: str | None = None
    engagement_samples: list[EngagementSampleRead] = Field(default_factory=list)

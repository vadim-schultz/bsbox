from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schema.engagement import EngagementSampleRead


class ParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    expires_at: datetime
    last_status: str | None = None
    engagement_samples: list[EngagementSampleRead] = Field(default_factory=list)

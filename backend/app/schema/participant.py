from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schema.engagement import EngagementSampleRead


class ParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    expires_at: datetime
    last_status: Optional[str] = None
    engagement_samples: List[EngagementSampleRead] = Field(default_factory=list)


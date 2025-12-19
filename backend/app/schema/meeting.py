from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.schema.participant import ParticipantRead


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    start_ts: datetime
    end_ts: datetime


class MeetingWithParticipants(MeetingRead):
    participants: List[ParticipantRead] = Field(default_factory=list)


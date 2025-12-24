from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EngagementSampleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bucket: datetime
    status: str


class EngagementPoint(BaseModel):
    bucket: datetime
    value: float


class ParticipantEngagementSeries(BaseModel):
    participant_id: str
    device_fingerprint: str
    series: list[EngagementPoint]


class EngagementSummary(BaseModel):
    meeting_id: str
    start: datetime
    end: datetime
    bucket_minutes: int
    window_minutes: int
    overall: list[EngagementPoint]
    participants: list[ParticipantEngagementSeries]

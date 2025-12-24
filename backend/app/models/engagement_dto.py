from datetime import datetime

from pydantic import BaseModel


class EngagementPointDTO(BaseModel):
    bucket: datetime
    value: float


class ParticipantSeriesDTO(BaseModel):
    participant_id: str
    device_fingerprint: str
    series: list[EngagementPointDTO]


class EngagementSummaryDTO(BaseModel):
    meeting_id: str
    start: datetime
    end: datetime
    bucket_minutes: int
    window_minutes: int
    participants: list[ParticipantSeriesDTO]
    overall: list[EngagementPointDTO]


class BucketRollupDTO(BaseModel):
    bucket: datetime
    participants: dict[str, float]
    overall: float

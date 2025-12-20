from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel


class EngagementPointDTO(BaseModel):
    bucket: datetime
    value: float


class ParticipantSeriesDTO(BaseModel):
    participant_id: str
    device_fingerprint: str
    series: List[EngagementPointDTO]


class EngagementSummaryDTO(BaseModel):
    meeting_id: str
    start: datetime
    end: datetime
    bucket_minutes: int
    window_minutes: int
    participants: List[ParticipantSeriesDTO]
    overall: List[EngagementPointDTO]


class BucketRollupDTO(BaseModel):
    bucket: datetime
    participants: Dict[str, float]
    overall: float

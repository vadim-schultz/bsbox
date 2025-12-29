"""Engagement-related schemas for tracking participant activity."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_serializer


class EngagementSampleRead(BaseModel):
    """A single engagement status sample for a participant at a specific time bucket."""

    model_config = ConfigDict(from_attributes=True)

    bucket: datetime
    status: str

    @field_serializer("bucket")
    def serialize_bucket(self, bucket: datetime) -> str:
        return bucket.isoformat()


class EngagementPoint(BaseModel):
    """A data point representing engagement score at a specific time bucket."""

    bucket: datetime
    value: float

    @field_serializer("bucket")
    def serialize_bucket(self, bucket: datetime) -> str:
        return bucket.isoformat()


class ParticipantEngagementSeries(BaseModel):
    """Time series of engagement scores for a single participant."""

    participant_id: str
    device_fingerprint: str
    series: list[EngagementPoint]


class EngagementSummary(BaseModel):
    """Complete engagement summary for a meeting including overall and per-participant data."""

    meeting_id: str
    start: datetime
    end: datetime
    bucket_minutes: int
    window_minutes: int
    overall: list[EngagementPoint]
    participants: list[ParticipantEngagementSeries]

    @field_serializer("start", "end")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()


class BucketRollup(BaseModel):
    """Aggregated engagement data for a single time bucket."""

    bucket: datetime
    participants: dict[str, float]
    overall: float

    @field_serializer("bucket")
    def serialize_bucket(self, bucket: datetime) -> str:
        return bucket.isoformat()


class DeltaMessageData(BaseModel):
    """Payload for a real-time engagement delta update."""

    meeting_id: str
    participant_id: str
    bucket: datetime
    status: str
    overall: float
    participants: dict[str, float]

    @field_serializer("bucket")
    def serialize_bucket(self, bucket: datetime) -> str:
        return bucket.isoformat()


class DeltaMessage(BaseModel):
    """WebSocket message for broadcasting engagement status changes."""

    type: Literal["delta"] = "delta"
    data: DeltaMessageData

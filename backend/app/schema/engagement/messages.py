"""Engagement realtime broadcast messages."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_serializer

from app.utils.datetime import isoformat_utc


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
        return isoformat_utc(bucket)


class DeltaMessage(BaseModel):
    """WebSocket message for broadcasting engagement status changes."""

    type: Literal["delta"] = "delta"
    data: DeltaMessageData

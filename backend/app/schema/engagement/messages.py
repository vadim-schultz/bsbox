"""Engagement realtime broadcast messages."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_serializer

from app.utils.datetime import isoformat_utc


class RollupData(BaseModel):
    """Unified rollup data for incremental broadcasts.

    Represents the current engagement state for all participants in a meeting
    at a specific time bucket. Used for both event-triggered and periodic updates.
    """

    meeting_id: str
    bucket: datetime
    overall: float
    participants: dict[str, float]  # participant_id -> engagement percentage

    @field_serializer("bucket")
    def serialize_bucket(self, bucket: datetime) -> str:
        return isoformat_utc(bucket)


class DeltaMessage(BaseModel):
    """WebSocket message for incremental engagement updates.

    Used for both event-driven updates (status changes, joins, leaves)
    and periodic updates (scheduled rollups).
    """

    type: Literal["delta"] = "delta"
    data: RollupData

"""WebSocket broadcast schemas sent via channels."""

from typing import Literal

from pydantic import BaseModel

from app.schema.engagement.models import EngagementSummary


class SnapshotMessage(BaseModel):
    """Complete engagement snapshot broadcast to all meeting participants."""

    type: Literal["snapshot"] = "snapshot"
    data: EngagementSummary


# Note: DeltaMessage exists in app.schema.engagement.messages and is reused

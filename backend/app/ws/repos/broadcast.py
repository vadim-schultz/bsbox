"""Repository for channel-based broadcasting operations.

This repo encapsulates all ChannelsPlugin interactions for publishing messages
to WebSocket subscribers. It provides a clean abstraction over the low-level
channel operations.
"""

import logging
from datetime import datetime
from typing import TYPE_CHECKING

from litestar.channels import ChannelsPlugin

from app.models import Meeting
from app.schema.engagement.messages import DeltaMessage, RollupData
from app.schema.engagement.models import EngagementSummary
from app.schema.websocket import SnapshotMessage

if TYPE_CHECKING:
    from app.services import EngagementService

logger = logging.getLogger(__name__)


class BroadcastRepo:
    """Repository for channel-based broadcasting operations.

    Handles all publish operations to broadcast real-time updates to WebSocket
    subscribers via Litestar's ChannelsPlugin. This repo centralizes channel
    naming conventions and message serialization.
    """

    def __init__(self, channels: ChannelsPlugin) -> None:
        """Initialize broadcast repo with channels plugin.

        Args:
            channels: Litestar ChannelsPlugin instance for pub/sub operations
        """
        self.channels = channels

    def publish(self, meeting_id: str, data: EngagementSummary | RollupData) -> None:
        """Publish engagement data to meeting subscribers.

        Automatically wraps the data in the appropriate message type based on
        the data structure:
        - EngagementSummary -> SnapshotMessage (complete historical data)
        - RollupData -> DeltaMessage (incremental update)

        Args:
            meeting_id: ID of the meeting to broadcast to
            data: Engagement data to broadcast (summary or rollup)
        """
        # Wrap data in appropriate message type
        message: SnapshotMessage | DeltaMessage
        if isinstance(data, EngagementSummary):
            message = SnapshotMessage(data=data)
        else:  # RollupData
            message = DeltaMessage(data=data)

        self.channels.publish(
            data=message.model_dump_json(),
            channels=[f"meeting:{meeting_id}"],
        )

        logger.debug("Published to channel meeting:%s", meeting_id)

    def publish_rollup(
        self, meeting: Meeting, bucket: datetime, engagement_service: "EngagementService"
    ) -> None:
        """Compute and broadcast engagement rollup for a meeting.

        This is a convenience method that combines rollup computation and broadcasting,
        used by join/status handlers and the periodic broadcaster.

        Args:
            meeting: The meeting to compute rollup for
            bucket: The time bucket for the rollup (already normalized)
            engagement_service: Service for computing engagement rollups
        """
        rollup = engagement_service.bucket_rollup(meeting, bucket)

        rollup_data = RollupData(
            meeting_id=meeting.id,
            bucket=bucket,
            overall=rollup["overall"],
            participants=rollup["participants"],
        )

        self.publish(meeting.id, rollup_data)
        logger.debug("Published rollup for meeting %s at bucket %s", meeting.id, bucket)

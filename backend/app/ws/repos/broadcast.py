"""Repository for channel-based broadcasting operations.

This repo encapsulates all ChannelsPlugin interactions for publishing messages
to WebSocket subscribers. It provides a clean abstraction over the low-level
channel operations.
"""

import logging

from litestar.channels import ChannelsPlugin

from app.schema.engagement.messages import DeltaMessage, DeltaMessageData
from app.schema.engagement.models import EngagementSummary
from app.schema.websocket import SnapshotMessage

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

    def publish_snapshot(self, meeting_id: str, summary: EngagementSummary) -> None:
        """Publish complete engagement snapshot to meeting subscribers.

        Broadcasts a full snapshot of meeting engagement data, typically sent when
        a participant joins or when a complete refresh is needed.

        Args:
            meeting_id: ID of the meeting to broadcast to
            summary: Complete engagement summary data
        """
        message = SnapshotMessage(data=summary)

        self.channels.publish(
            data=message.model_dump_json(),
            channels=[f"meeting:{meeting_id}"],
        )

        logger.debug("Published snapshot to channel meeting:%s", meeting_id)

    def publish_delta(self, meeting_id: str, delta_data: DeltaMessageData) -> None:
        """Publish incremental engagement delta to meeting subscribers.

        Broadcasts a delta update when a participant's engagement status changes,
        providing real-time updates without sending the full dataset.

        Args:
            meeting_id: ID of the meeting to broadcast to
            delta_data: Delta update data with participant status change
        """
        message = DeltaMessage(data=delta_data)

        self.channels.publish(
            data=message.model_dump_json(),
            channels=[f"meeting:{meeting_id}"],
        )

        logger.debug("Published delta to channel meeting:%s", meeting_id)

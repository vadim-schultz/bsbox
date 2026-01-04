"""Repository for subscribing to channel broadcasts.

This repo encapsulates all ChannelsPlugin interactions for subscribing to
messages from broadcast channels. It provides a clean abstraction over the
low-level subscription operations.
"""

import logging
from collections.abc import AsyncGenerator

import anyio
from litestar.channels import ChannelsPlugin

logger = logging.getLogger(__name__)


class SubscriptionRepo:
    """Repository for subscribing to channel broadcasts.

    Handles all subscription operations to receive real-time updates from
    broadcast channels via Litestar's ChannelsPlugin. This repo manages the
    subscription lifecycle and event streaming.
    """

    def __init__(self, channels: ChannelsPlugin) -> None:
        """Initialize subscription repo with channels plugin.

        Args:
            channels: Litestar ChannelsPlugin instance for pub/sub operations
        """
        self.channels = channels

    async def subscribe_to_meeting(
        self,
        meeting_id: str,
        is_closed: anyio.Event,
    ) -> AsyncGenerator[str, None]:
        """Subscribe to all broadcasts for a meeting.

        Creates an async generator that yields broadcast events from the meeting
        channel. The subscription is automatically closed when the connection ends.

        Args:
            meeting_id: ID of the meeting to subscribe to
            is_closed: Event that signals when the connection is closed

        Yields:
            Decoded broadcast events as JSON strings
        """
        channel_name = f"meeting:{meeting_id}"
        logger.debug("Starting subscription for channel %s", channel_name)

        async with self.channels.start_subscription([channel_name]) as subscriber:
            async for event in subscriber.iter_events():
                decoded = event.decode("utf-8")
                yield decoded
                if is_closed.is_set():
                    logger.debug("Connection closed, stopping subscription for %s", channel_name)
                    break

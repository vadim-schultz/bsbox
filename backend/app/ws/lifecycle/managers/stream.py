"""Channel stream management for WebSocket connections."""

import logging
from collections.abc import AsyncGenerator

import anyio
from litestar.channels import ChannelsPlugin

logger = logging.getLogger(__name__)


class ChannelStreamManager:
    """Manages channel event streaming for WebSocket connections."""

    def __init__(self, channels: ChannelsPlugin):
        self.channels = channels

    async def create_event_stream(
        self,
        channel_name: str,
        is_closed: anyio.Event,
    ) -> AsyncGenerator[str, None]:
        """Create async generator for channel events.

        Args:
            channel_name: Name of the channel to subscribe to
            is_closed: Event that signals when the connection is closed

        Yields:
            Decoded channel events as strings
        """
        logger.debug("Starting channel stream for %s", channel_name)
        async with self.channels.start_subscription([channel_name]) as subscriber:
            async for event in subscriber.iter_events():
                if is_closed.is_set():
                    logger.debug("Connection closed, stopping stream for %s", channel_name)
                    break
                yield event.decode("utf-8")

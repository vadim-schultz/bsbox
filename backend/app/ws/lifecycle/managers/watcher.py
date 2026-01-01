"""Meeting end watcher for WebSocket connections."""

import contextlib
import logging

import anyio
from litestar import WebSocket

from app.models import Meeting
from app.schema.websocket import MeetingEndedResponse
from app.utils.datetime import ensure_utc, isoformat_utc

logger = logging.getLogger(__name__)


class MeetingEndWatcher:
    """Watches for meeting end and closes WebSocket connection."""

    async def watch(
        self,
        meeting: Meeting,
        socket: WebSocket,
        is_closed: anyio.Event,
        seconds_remaining: float,
    ) -> None:
        """Watch for meeting end and close connection.

        Args:
            meeting: Meeting to watch
            socket: WebSocket connection to close
            is_closed: Event to signal when connection is closed
            seconds_remaining: Seconds until meeting ends
        """
        logger.debug(
            "Starting meeting end watcher for %s (%.1fs remaining)", meeting.id, seconds_remaining
        )

        # Sleep until meeting ends
        await anyio.sleep(seconds_remaining)

        # If connection already closed, nothing to do
        if is_closed.is_set():
            return

        logger.info("Meeting %s ended, closing connection", meeting.id)

        # Send end notification and close socket
        with contextlib.suppress(Exception):
            end_time = isoformat_utc(ensure_utc(meeting.end_ts))
            response = MeetingEndedResponse(
                message=f"The meeting has ended at {end_time}.",
                end_time=end_time,
            )
            await socket.send_json(response.model_dump(mode="json"))

        # Signal that connection is closed
        is_closed.set()

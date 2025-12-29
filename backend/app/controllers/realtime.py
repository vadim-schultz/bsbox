"""WebSocket handler for real-time meeting engagement updates."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import anyio
from litestar import WebSocket, websocket_listener
from litestar.channels import ChannelsPlugin
from litestar.exceptions import WebSocketDisconnect
from litestar.handlers import send_websocket_stream
from sqlalchemy.orm import Session

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService, MeetingService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def meeting_stream_lifespan(
    socket: WebSocket,
    channels: ChannelsPlugin,
    session: Session,
) -> AsyncGenerator[None, Any]:
    """Lifespan context for meeting stream WebSocket connections.

    Handles meeting validation, initial snapshot, channel subscription,
    and event streaming. Cleanup is automatic on context exit.
    """
    meeting_id = socket.path_params.get("meeting_id")
    logger.info("WS connection accepted meeting_id=%s", meeting_id)

    # Validate meeting exists using DI-provided session
    meeting_service = MeetingService(MeetingRepo(session))
    engagement_service = EngagementService(
        EngagementRepo(session), ParticipantRepo(session)
    )

    meeting = meeting_service.get_meeting(meeting_id)
    if not meeting:
        logger.warning("WS meeting not found meeting_id=%s", meeting_id)
        await socket.close(code=4404, reason="Meeting not found")
        return

    # Send initial snapshot
    summary = engagement_service.build_engagement_summary(meeting)
    await socket.send_json({"type": "snapshot", "data": summary.model_dump(mode="json")})

    # Subscribe to channel and stream events
    channel_name = f"meeting:{meeting_id}"
    is_closed = anyio.Event()

    async def channel_event_stream() -> AsyncGenerator[str, None]:
        """Generator that yields channel events as strings for send_websocket_stream."""
        async with channels.start_subscription([channel_name]) as subscriber:
            async for event in subscriber.iter_events():
                if is_closed.is_set():
                    break
                # Events are bytes, decode to string for text mode
                yield event.decode("utf-8")

    async with anyio.create_task_group() as tg:
        tg.start_soon(send_websocket_stream, socket, channel_event_stream())

        try:
            yield  # Hand control to the listener for receiving messages
        except WebSocketDisconnect:
            logger.info("WS disconnect meeting_id=%s", meeting_id)
        finally:
            is_closed.set()


@websocket_listener(
    "/ws/meetings/{meeting_id:str}",
    connection_lifespan=meeting_stream_lifespan,
)
def meeting_stream_handler(data: str) -> str | None:
    """Handle incoming WebSocket messages (ping/pong).

    This is called for each message received from the client.
    Channel events are streamed to the client via the lifespan's send_websocket_stream.
    """
    if data == "ping":
        return '{"type": "pong"}'
    return None

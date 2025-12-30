"""WebSocket handler for real-time meeting engagement updates."""

import contextlib
import json
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import anyio
from litestar import WebSocket, websocket_listener
from litestar.channels import ChannelsPlugin
from litestar.exceptions import WebSocketDisconnect
from litestar.handlers import send_websocket_stream
from sqlalchemy.orm import Session

from app.models import Meeting
from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService, MeetingService
from app.ws import ErrorResponse, MeetingEndedResponse, WSContext, WSMessageHandlerFactory

logger = logging.getLogger(__name__)


def _seconds_until_meeting_end(meeting: Meeting) -> float:
    """Calculate seconds until meeting ends."""
    now = datetime.now(tz=UTC)
    end_ts = meeting.end_ts.replace(tzinfo=UTC) if meeting.end_ts.tzinfo is None else meeting.end_ts
    return max(0, (end_ts - now).total_seconds())


@asynccontextmanager
async def meeting_stream_lifespan(
    socket: WebSocket,
    channels: ChannelsPlugin,
    session: Session,
) -> AsyncGenerator[None, Any]:
    """Lifespan context for meeting stream WebSocket connections.

    Handles meeting validation, initial snapshot, channel subscription,
    event streaming, and automatic close when meeting ends.
    """
    meeting_id: str = socket.path_params.get("meeting_id", "")
    logger.info("WS connection accepted meeting_id=%s", meeting_id)

    # Validate meeting exists
    meeting_service = MeetingService(MeetingRepo(session))
    engagement_service = EngagementService(EngagementRepo(session), ParticipantRepo(session))

    meeting = meeting_service.get_meeting(meeting_id)
    if not meeting:
        logger.warning("WS meeting not found meeting_id=%s", meeting_id)
        await socket.close(code=4404, reason="Meeting not found")
        return

    # Check if meeting already ended
    seconds_remaining = _seconds_until_meeting_end(meeting)
    if seconds_remaining <= 0:
        logger.info("WS meeting already ended meeting_id=%s", meeting_id)
        await socket.send_json(MeetingEndedResponse().to_dict())
        await socket.close(code=1000, reason="Meeting ended")
        return

    # Initialize context for handlers
    context = WSContext(
        socket=socket,
        meeting=meeting,
        session=session,
        channels=channels,
    )

    # Store context and factory on socket state for handler access
    socket.state.ws_context = context
    socket.state.handler_factory = WSMessageHandlerFactory(session)

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
                yield event.decode("utf-8")

    async def meeting_end_watcher() -> None:
        """Close WebSocket when meeting ends."""
        await anyio.sleep(seconds_remaining)
        if not is_closed.is_set():
            logger.info("WS meeting ended, closing connection meeting_id=%s", meeting_id)
            with contextlib.suppress(Exception):
                await socket.send_json(MeetingEndedResponse().to_dict())
            is_closed.set()

    async with anyio.create_task_group() as tg:
        tg.start_soon(send_websocket_stream, socket, channel_event_stream())
        tg.start_soon(meeting_end_watcher)

        try:
            yield  # Hand control to the listener for receiving messages
        except WebSocketDisconnect:
            logger.info("WS disconnect meeting_id=%s", meeting_id)
        finally:
            is_closed.set()
            # Commit any pending changes (e.g., last_seen_at updates)
            try:
                session.commit()
            except Exception:
                session.rollback()


@websocket_listener(
    "/ws/meetings/{meeting_id:str}",
    connection_lifespan=meeting_stream_lifespan,
)
async def meeting_stream_handler(data: str, socket: WebSocket) -> str | None:
    """Handle incoming WebSocket messages using handler factory pattern.

    Delegates to appropriate handler based on message type.
    Channel events are streamed to the client via the lifespan's send_websocket_stream.
    """
    # Parse message
    try:
        message = json.loads(data)
    except json.JSONDecodeError:
        return json.dumps(ErrorResponse(message="Invalid JSON").to_dict())

    message_type = message.get("type")
    if not message_type:
        return json.dumps(ErrorResponse(message="Missing message type").to_dict())

    # Get context and factory from socket state
    context: WSContext = socket.state.ws_context
    factory: WSMessageHandlerFactory = socket.state.handler_factory

    # Get handler for message type
    handler = factory.get_handler(message_type)
    if not handler:
        return json.dumps(ErrorResponse(message=f"Unknown message type: {message_type}").to_dict())

    # Execute handler
    response = await handler.handle(context, message)

    if response:
        return json.dumps(response.to_dict())

    return None

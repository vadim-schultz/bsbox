"""WebSocket connection controller for meeting real-time updates.

This module provides the main WebSocket endpoint for real-time meeting
engagement tracking, handling connection lifecycle and message routing.
"""

import json
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

from app.repos import MeetingRepo
from app.schema.websocket import ErrorResponse
from app.services import MeetingService
from app.ws.controllers.routing import MessageRouter
from app.ws.transport.lifecycle import (
    ConnectionValidator,
    LifecycleCoordinator,
    MeetingTimingValidator,
)

logger = logging.getLogger(__name__)


async def _setup_connection(
    socket: WebSocket,
    channels: ChannelsPlugin,
    session: Session,
):
    """Setup and validate WebSocket connection.

    Returns:
        LifecycleResult if successful, None if connection rejected
    """
    coordinator = LifecycleCoordinator(
        connection_validator=ConnectionValidator(MeetingTimingValidator()),
        meeting_service=MeetingService(MeetingRepo(session)),
    )

    result = await coordinator.setup(socket, channels, session)
    if not result:
        return None  # Connection rejected, response already sent

    # Store context and factory on socket state for handler access
    socket.state.ws_context = result.context
    socket.state.service_factory = result.factory

    return result


def _start_background_tasks(task_group: anyio.abc.TaskGroup, result, socket: WebSocket) -> None:
    """Start subscription and watcher background tasks.

    Args:
        task_group: anyio task group to spawn tasks in
        result: LifecycleResult with subscription repo and watcher
        socket: WebSocket connection
    """
    # Start subscription stream task
    task_group.start_soon(
        send_websocket_stream,
        socket,
        result.subscription_repo.subscribe_to_meeting(
            result.context.meeting.id,
            result.is_closed,
        ),
    )

    # Start meeting end watcher task
    task_group.start_soon(
        result.watcher.watch,
        result.context.meeting,
        socket,
        result.is_closed,
        result.seconds_remaining,
    )


def _handle_disconnect(result, session: Session) -> None:
    """Handle connection cleanup on disconnect.

    Args:
        result: LifecycleResult with context and factory
        session: Database session for committing changes
    """
    result.is_closed.set()

    # Handle participant leave via service
    leave_service = result.factory.create_leave_service()
    leave_service.handle_leave(result.context)

    # Commit any pending changes (e.g., last_seen_at updates)
    try:
        session.commit()
    except Exception:
        session.rollback()


@asynccontextmanager
async def meeting_stream_lifespan(
    socket: WebSocket,
    channels: ChannelsPlugin,
    session: Session,
) -> AsyncGenerator[None, Any]:
    """WebSocket connection lifespan manager.

    Handles connection setup, message streaming, and cleanup.

    Note: Initial snapshot is returned in JoinedResponse to the joining client.
    Deltas are broadcast to other participants on join/leave/status changes.
    """
    # Setup and validate connection
    result = await _setup_connection(socket, channels, session)
    if not result:
        return

    # Run subscription and watcher tasks
    try:
        async with anyio.create_task_group() as tg:
            _start_background_tasks(tg, result, socket)

            try:
                yield  # Hand control to the listener for receiving messages
            except WebSocketDisconnect:
                logger.info("WS disconnect meeting_id=%s", result.context.meeting.id)
            finally:
                _handle_disconnect(result, session)

    except Exception as e:
        logger.exception("WS task group error: %s", e)
        raise


@websocket_listener(
    "/ws/meetings/{meeting_id:str}",
    connection_lifespan=meeting_stream_lifespan,
)
async def meeting_stream_controller(data: str, socket: WebSocket) -> str:
    """Handle incoming WebSocket messages using router.

    Routes messages to appropriate services via the message router.
    Broadcast events are streamed to the client via the lifespan's subscription.

    Args:
        data: Raw JSON string from client
        socket: WebSocket connection instance

    Returns:
        JSON response string or empty string for broadcast-only responses
    """
    try:
        message = json.loads(data)
    except json.JSONDecodeError:
        error = ErrorResponse(message="Invalid JSON")
        return str(error.model_dump_json())
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("WS decode error: %s", exc)
        error = ErrorResponse(message="Invalid payload")
        return str(error.model_dump_json())

    try:
        context = socket.state.ws_context
        factory = socket.state.service_factory

        router = MessageRouter()
        response = await router.route_message(message, context, factory)
        if response:
            return str(response.model_dump_json())
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("WS processing error: %s", exc)
        error = ErrorResponse(message="Internal error")
        return str(error.model_dump_json())

    # Litestar expects a string/bytes payload; returning an empty string avoids None decode errors
    # when services deliberately produce no direct response (e.g., status updates broadcast via channel).
    return ""

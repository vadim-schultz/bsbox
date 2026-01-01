"""WebSocket handler for real-time meeting engagement updates."""

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
from app.ws.context import WSContext
from app.ws.factory import WSMessageHandlerFactory
from app.ws.lifecycle import LifecycleCoordinator
from app.ws.lifecycle.validators.connection import ConnectionValidator
from app.ws.lifecycle.validators.timing import MeetingTimingValidator
from app.ws.processor import process_ws_message

logger = logging.getLogger(__name__)


@asynccontextmanager
async def meeting_stream_lifespan(
    socket: WebSocket,
    channels: ChannelsPlugin,
    session: Session,
) -> AsyncGenerator[None, Any]:
    """WebSocket connection lifespan using lifecycle coordinator.

    Delegates to coordinator for validation, setup, and management of
    channel streaming and meeting end watching.
    """
    # Create coordinator with dependencies
    coordinator = LifecycleCoordinator(
        connection_validator=ConnectionValidator(MeetingTimingValidator()),
        meeting_service=MeetingService(MeetingRepo(session)),
    )

    # Setup lifecycle
    result = await coordinator.setup(socket, channels, session)
    if not result:
        return  # Connection rejected, response already sent

    # Store context and factory on socket state for handler access
    socket.state.ws_context = result.context
    socket.state.handler_factory = result.factory

    # Note: Initial snapshot is sent after join (in JoinHandler) to include
    # the newly created participant

    # Run stream and watcher tasks
    try:
        async with anyio.create_task_group() as tg:
            tg.start_soon(
                send_websocket_stream,
                socket,
                result.stream_manager.create_event_stream(
                    f"meeting:{result.context.meeting.id}",
                    result.is_closed,
                ),
            )
            tg.start_soon(
                result.watcher.watch,
                result.context.meeting,
                socket,
                result.is_closed,
                result.seconds_remaining,
            )

            try:
                yield  # Hand control to the listener for receiving messages
            except WebSocketDisconnect:
                logger.info("WS disconnect meeting_id=%s", result.context.meeting.id)
            finally:
                result.is_closed.set()
                # Commit any pending changes (e.g., last_seen_at updates)
                try:
                    session.commit()
                except Exception:
                    session.rollback()
    except Exception as e:
        logger.exception("WS task group error: %s", e)
        raise


@websocket_listener(
    "/ws/meetings/{meeting_id:str}",
    connection_lifespan=meeting_stream_lifespan,
)
async def meeting_stream_handler(data: str, socket: WebSocket) -> str:
    """Handle incoming WebSocket messages using processor.

    Delegates to processor which routes via discriminated union.
    Channel events are streamed to the client via the lifespan's send_websocket_stream.
    """
    try:
        message = json.loads(data)
    except json.JSONDecodeError:
        error = ErrorResponse(message="Invalid JSON")
        return error.model_dump_json()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("WS decode error: %s", exc)
        error = ErrorResponse(message="Invalid payload")
        return error.model_dump_json()

    try:
        context: WSContext = socket.state.ws_context
        factory: WSMessageHandlerFactory = socket.state.handler_factory

        response = await process_ws_message(message, context, factory)
        if response:
            return response.model_dump_json()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("WS processing error: %s", exc)
        error = ErrorResponse(message="Internal error")
        return error.model_dump_json()

    # Litestar expects a string/bytes payload; returning an empty string avoids None decode errors
    # when handlers deliberately produce no direct response (e.g., status updates broadcast via channel).
    return ""

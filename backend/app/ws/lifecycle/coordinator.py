"""WebSocket connection lifecycle coordinator."""

import logging
from dataclasses import dataclass

import anyio
from litestar import WebSocket
from litestar.channels import ChannelsPlugin
from sqlalchemy.orm import Session

from app.services import MeetingService
from app.ws.context import WSContext
from app.ws.factory import WSMessageHandlerFactory
from app.ws.lifecycle.managers.stream import ChannelStreamManager
from app.ws.lifecycle.managers.watcher import MeetingEndWatcher
from app.ws.lifecycle.validators.connection import ConnectionValidator

logger = logging.getLogger(__name__)


@dataclass
class LifecycleResult:
    """Result of lifecycle setup containing all necessary components."""

    context: WSContext
    factory: WSMessageHandlerFactory
    stream_manager: ChannelStreamManager
    watcher: MeetingEndWatcher
    is_closed: anyio.Event
    seconds_remaining: float


class LifecycleCoordinator:
    """Orchestrates WebSocket connection lifecycle setup and validation."""

    def __init__(
        self,
        connection_validator: ConnectionValidator,
        meeting_service: MeetingService,
    ):
        self.connection_validator = connection_validator
        self.meeting_service = meeting_service

    async def setup(
        self,
        socket: WebSocket,
        channels: ChannelsPlugin,
        session: Session,
    ) -> LifecycleResult | None:
        """Setup connection lifecycle.

        Returns None if connection rejected, otherwise returns LifecycleResult
        with all necessary components for managing the connection.
        """
        # 1. Get meeting_id from socket path
        meeting_id: str = socket.path_params.get("meeting_id", "")
        logger.info("Setting up WS lifecycle for meeting_id=%s", meeting_id)

        # 2. Load meeting from database
        meeting = self.meeting_service.get_meeting(meeting_id)

        # 3. Validate connection and send responses if needed
        meeting, check = await self.connection_validator.validate_and_send_response(meeting, socket)
        if not meeting or not check:
            # Connection rejected (meeting not found or ended)
            return None

        # 4. Create context for handlers
        context = WSContext(
            socket=socket,
            meeting=meeting,
            session=session,
            channels=channels,
        )

        # 5. Create handler factory
        factory = WSMessageHandlerFactory(session)

        # 6. Create managers
        stream_manager = ChannelStreamManager(channels)
        watcher = MeetingEndWatcher()
        is_closed = anyio.Event()

        logger.info("WS lifecycle setup complete for meeting_id=%s", meeting_id)

        return LifecycleResult(
            context=context,
            factory=factory,
            stream_manager=stream_manager,
            watcher=watcher,
            is_closed=is_closed,
            seconds_remaining=check.seconds_remaining,
        )

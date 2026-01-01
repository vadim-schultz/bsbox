"""Coordinator for WebSocket connection lifecycle setup."""

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

import anyio
from litestar import WebSocket
from litestar.channels import ChannelsPlugin
from sqlalchemy.orm import Session

from app.services import MeetingService
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.repos.subscription import SubscriptionRepo
from app.ws.transport.context import WSContext
from app.ws.transport.lifecycle.validators import ConnectionValidator
from app.ws.transport.lifecycle.watcher import MeetingEndWatcher

if TYPE_CHECKING:
    from app.ws.shared.factory import WSServiceFactory

logger = logging.getLogger(__name__)


@dataclass
class LifecycleResult:
    """Result of lifecycle setup containing all necessary components."""

    context: WSContext
    factory: "WSServiceFactory"
    subscription_repo: SubscriptionRepo
    watcher: MeetingEndWatcher
    is_closed: anyio.Event
    seconds_remaining: float


class LifecycleCoordinator:
    """Orchestrates WebSocket connection lifecycle setup and validation."""

    def __init__(
        self,
        connection_validator: ConnectionValidator,
        meeting_service: MeetingService,
    ) -> None:
        """Initialize coordinator with validators and services.

        Args:
            connection_validator: Validator for connection checks
            meeting_service: Service for meeting operations
        """
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

        # 4. Create repos
        broadcast_repo = BroadcastRepo(channels)
        subscription_repo = SubscriptionRepo(channels)

        # 5. Create context for services (no channels field)
        context = WSContext(
            socket=socket,
            meeting=meeting,
            session=session,
        )

        # 6. Create service factory with broadcast repo
        from app.ws.shared.factory import WSServiceFactory

        factory = WSServiceFactory(session, broadcast_repo)

        # 7. Create watcher and event
        watcher = MeetingEndWatcher()
        is_closed = anyio.Event()

        logger.info("WS lifecycle setup complete for meeting_id=%s", meeting_id)

        return LifecycleResult(
            context=context,
            factory=factory,
            subscription_repo=subscription_repo,
            watcher=watcher,
            is_closed=is_closed,
            seconds_remaining=check.seconds_remaining,
        )

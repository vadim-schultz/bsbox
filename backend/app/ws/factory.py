"""WebSocket message handler factory."""

from typing import cast

from sqlalchemy.orm import Session

from app.repos import EngagementRepo, ParticipantRepo
from app.services import EngagementService, ParticipantService
from app.ws.handlers import JoinHandler, PingHandler, StatusHandler
from app.ws.protocol import WSMessageHandler


class WSMessageHandlerFactory:
    """Factory for creating WebSocket message handlers."""

    def __init__(self, session: Session) -> None:
        # Initialize repos
        participant_repo = ParticipantRepo(session)
        engagement_repo = EngagementRepo(session)

        # Initialize services
        participant_service = ParticipantService(participant_repo)
        engagement_service = EngagementService(engagement_repo, participant_repo)

        # Register handlers (cast to protocol type for mypy)
        self._handlers: dict[str, WSMessageHandler] = {
            "join": cast(WSMessageHandler, JoinHandler(participant_service, engagement_service)),
            "status": cast(WSMessageHandler, StatusHandler(engagement_service)),
            "ping": cast(WSMessageHandler, PingHandler()),
        }

    def get_handler(self, message_type: str) -> WSMessageHandler | None:
        """Get handler for message type, or None if unknown."""
        return self._handlers.get(message_type)

    @property
    def supported_types(self) -> list[str]:
        """List of supported message types."""
        return list(self._handlers.keys())

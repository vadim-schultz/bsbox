"""WebSocket connection context - shared state for message services."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from litestar import WebSocket
    from sqlalchemy.orm import Session

    from app.models import Meeting, Participant


class WSContext:
    """Shared context for all WebSocket message services.

    Pure data container holding connection state and dependencies.
    Business logic should be in services, not here. Broadcast operations
    are handled by BroadcastRepo injected into services.
    """

    def __init__(
        self,
        socket: "WebSocket",
        meeting: "Meeting",
        session: "Session",
        participant: "Participant | None" = None,
    ) -> None:
        """Initialize WebSocket context.

        Args:
            socket: WebSocket connection instance
            meeting: Meeting model for this connection
            session: Database session for queries
            participant: Optional participant (set after join)
        """
        self.socket = socket
        self.meeting = meeting
        self.session = session
        self.participant = participant

    def set_participant(self, participant: "Participant") -> None:
        """Set the participant for this connection.

        Args:
            participant: Participant model to associate with this connection
        """
        self.participant = participant

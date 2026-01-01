"""WebSocket connection context - shared state for message handlers."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from litestar import WebSocket
    from litestar.channels import ChannelsPlugin
    from sqlalchemy.orm import Session

    from app.models import Meeting, Participant


class WSContext:
    """Shared context for all WebSocket message handlers.

    Pure data container holding connection state and dependencies.
    Business logic should be in services/handlers, not here.
    """

    def __init__(
        self,
        socket: "WebSocket",
        meeting: "Meeting",
        session: "Session",
        channels: "ChannelsPlugin",
        participant: "Participant | None" = None,
    ) -> None:
        self.socket = socket
        self.meeting = meeting
        self.session = session
        self.channels = channels
        self.participant = participant

    def set_participant(self, participant: "Participant") -> None:
        """Set the participant for this connection."""
        self.participant = participant

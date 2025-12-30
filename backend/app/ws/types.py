"""WebSocket types: context, response classes, and handler protocol."""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Protocol

if TYPE_CHECKING:
    from litestar import WebSocket
    from litestar.channels import ChannelsPlugin
    from sqlalchemy.orm import Session

    from app.models import Meeting, Participant


@dataclass
class WSContext:
    """Shared context for all WebSocket message handlers."""

    socket: "WebSocket"
    meeting: "Meeting"
    session: "Session"
    channels: "ChannelsPlugin"
    participant: "Participant | None" = None

    def set_participant(self, participant: "Participant") -> None:
        """Set the participant for this connection."""
        self.participant = participant


@dataclass
class WSResponse:
    """Base response sent back to client."""

    type: str

    def to_dict(self) -> dict[str, Any]:
        """Convert response to dictionary for JSON serialization."""
        return {"type": self.type, **self._extra_fields()}

    def _extra_fields(self) -> dict[str, Any]:
        """Override in subclasses to add extra fields."""
        return {}


@dataclass
class JoinedResponse(WSResponse):
    """Response when a participant successfully joins."""

    type: str = field(default="joined", init=False)
    participant_id: str = ""
    meeting_id: str = ""

    def _extra_fields(self) -> dict[str, Any]:
        return {"participant_id": self.participant_id, "meeting_id": self.meeting_id}


@dataclass
class PongResponse(WSResponse):
    """Response to a ping message."""

    type: str = field(default="pong", init=False)
    server_time: str = ""

    def _extra_fields(self) -> dict[str, Any]:
        return {"server_time": self.server_time}


@dataclass
class ErrorResponse(WSResponse):
    """Error response."""

    type: str = field(default="error", init=False)
    message: str = ""

    def _extra_fields(self) -> dict[str, Any]:
        return {"message": self.message}


@dataclass
class MeetingEndedResponse(WSResponse):
    """Notification that the meeting has ended."""

    type: str = field(default="meeting_ended", init=False)


class WSMessageHandler(Protocol):
    """Protocol for WebSocket message handlers."""

    async def handle(self, context: WSContext, message: dict[str, Any]) -> WSResponse | None:
        """Process message and optionally return a response."""
        ...

"""WebSocket request schemas from clients."""

from typing import TYPE_CHECKING, Annotated, Literal

from pydantic import BaseModel, Field, field_validator

from app.schema.participant.types import StatusLiteral
from app.schema.websocket.base import WSRequestBase

if TYPE_CHECKING:
    from app.ws.context import WSContext


class JoinRequest(WSRequestBase):
    """Request to join a meeting WebSocket connection."""

    type: Literal["join"] = "join"
    fingerprint: str = Field(..., description="Device fingerprint for participant identification")

    @field_validator("fingerprint")
    @classmethod
    def _validate_fingerprint(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("fingerprint cannot be empty")
        return cleaned

    def validate_participant(self, context: "WSContext") -> BaseModel | None:
        """Check that participant has not already joined."""
        from app.schema.websocket.responses import ErrorResponse

        if context.participant:
            return ErrorResponse(message="Already joined")
        return None


class StatusUpdateRequest(WSRequestBase):
    """Request to update participant engagement status."""

    type: Literal["status"] = "status"
    status: StatusLiteral = Field(..., description="Participant engagement status")

    def validate_participant(self, context: "WSContext") -> BaseModel | None:
        """Check that participant has joined."""
        from app.schema.websocket.responses import ErrorResponse

        if not context.participant:
            return ErrorResponse(message="Not joined")
        return None


class PingRequest(WSRequestBase):
    """Keepalive ping request with optional client timestamp."""

    type: Literal["ping"] = "ping"
    client_time: str | None = Field(
        default=None, description="Optional ISO 8601 timestamp from client"
    )

    def validate_meeting(self, context: "WSContext") -> BaseModel | None:
        """Ping doesn't require meeting to be active."""
        return None


# Discriminated union for automatic request routing
WSRequest = Annotated[
    JoinRequest | StatusUpdateRequest | PingRequest,
    Field(discriminator="type"),
]

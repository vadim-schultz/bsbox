"""WebSocket request and response schemas using Pydantic models."""

from typing import TYPE_CHECKING, Annotated, Literal

from pydantic import BaseModel, Field, field_validator

from app.schema.engagement import EngagementSummary
from app.schema.participant import StatusLiteral
from app.utils.datetime import ensure_utc, isoformat_utc

if TYPE_CHECKING:
    from app.ws.context import WSContext


# ============================================================================
# Request Models (incoming from clients)
# ============================================================================


class WSRequestBase(BaseModel):
    """Base class for WebSocket requests with validation."""

    type: str

    def validate_meeting(self, context: "WSContext") -> BaseModel | None:
        """Validate meeting is active (started and not ended).

        Override in subclasses if different validation needed.
        Default: checks meeting has started and hasn't ended.
        """
        has_started, has_ended = context.meeting.time_status()

        if not has_started:
            start_time = isoformat_utc(ensure_utc(context.meeting.start_ts))
            return MeetingNotStartedResponse(
                message=f"The meeting has not started yet. It begins at {start_time}.",
                start_time=start_time,
            )

        if has_ended:
            end_time = isoformat_utc(ensure_utc(context.meeting.end_ts))
            return MeetingEndedResponse(
                message=f"The meeting has already ended at {end_time}.",
                end_time=end_time,
            )

        return None

    def validate_participant(self, context: "WSContext") -> BaseModel | None:
        """Validate participant state. Override in subclasses."""
        return None


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
        if context.participant:
            return ErrorResponse(message="Already joined")
        return None


class StatusUpdateRequest(WSRequestBase):
    """Request to update participant engagement status."""

    type: Literal["status"] = "status"
    status: StatusLiteral = Field(..., description="Participant engagement status")

    def validate_participant(self, context: "WSContext") -> BaseModel | None:
        """Check that participant has joined."""
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


# ============================================================================
# Response Models (outgoing to clients)
# ============================================================================


class JoinedResponse(BaseModel):
    """Response when a participant successfully joins."""

    type: Literal["joined"] = "joined"
    participant_id: str
    meeting_id: str


class PongResponse(BaseModel):
    """Response to a ping message."""

    type: Literal["pong"] = "pong"
    server_time: str


class ErrorResponse(BaseModel):
    """Error response for invalid requests or failures."""

    type: Literal["error"] = "error"
    message: str


class MeetingEndedResponse(BaseModel):
    """Notification that the meeting has ended."""

    type: Literal["meeting_ended"] = "meeting_ended"
    message: str = "The meeting has ended."
    end_time: str


class MeetingNotStartedResponse(BaseModel):
    """Notification that the meeting has not started yet."""

    type: Literal["meeting_not_started"] = "meeting_not_started"
    message: str = "The meeting has not started yet."
    start_time: str


class MeetingCountdownResponse(BaseModel):
    """Countdown data when user connects before meeting starts."""

    type: Literal["meeting_countdown"] = "meeting_countdown"
    meeting_id: str
    start_time: str
    server_time: str
    city_name: str | None = None
    meeting_room_name: str | None = None


# ============================================================================
# Broadcast Models (sent via channels to all subscribers)
# ============================================================================


class SnapshotMessage(BaseModel):
    """Complete engagement snapshot broadcast to all meeting participants."""

    type: Literal["snapshot"] = "snapshot"
    data: EngagementSummary


# Note: DeltaMessage already exists in app.schema.engagement and will be reused

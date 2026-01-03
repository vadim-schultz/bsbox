"""WebSocket protocol schemas."""

from app.schema.websocket.base import WSRequestBase
from app.schema.websocket.broadcasts import SnapshotMessage
from app.schema.websocket.requests import (
    JoinRequest,
    PingRequest,
    StatusUpdateRequest,
    WSRequest,
)
from app.schema.websocket.responses import (
    ErrorResponse,
    JoinedResponse,
    MeetingCountdownResponse,
    MeetingEndedResponse,
    MeetingNotStartedResponse,
    MeetingStartedResponse,
    PongResponse,
)

__all__ = [
    # Base
    "WSRequestBase",
    # Requests
    "JoinRequest",
    "StatusUpdateRequest",
    "PingRequest",
    "WSRequest",
    # Responses
    "JoinedResponse",
    "PongResponse",
    "ErrorResponse",
    "MeetingEndedResponse",
    "MeetingNotStartedResponse",
    "MeetingCountdownResponse",
    "MeetingStartedResponse",
    # Broadcasts
    "SnapshotMessage",
]

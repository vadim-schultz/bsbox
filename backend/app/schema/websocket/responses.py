"""WebSocket response schemas sent to clients."""

from typing import Literal

from pydantic import BaseModel

from app.schema.engagement.models import EngagementSummary


class JoinedResponse(BaseModel):
    """Response when a participant successfully joins.

    Includes a complete engagement snapshot for the joining client,
    eliminating the need to broadcast snapshots to all participants.
    """

    type: Literal["joined"] = "joined"
    participant_id: str
    meeting_id: str
    snapshot: EngagementSummary


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


class MeetingStartedResponse(BaseModel):
    """Notification that the meeting has started (sent to countdown clients)."""

    type: Literal["meeting_started"] = "meeting_started"
    meeting_id: str
    message: str = "The meeting has started."

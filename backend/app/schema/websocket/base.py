"""WebSocket request base class."""

from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.utils.datetime import ensure_utc, isoformat_utc

if TYPE_CHECKING:
    from app.ws.context import WSContext


class WSRequestBase(BaseModel):
    """Base class for WebSocket requests with validation."""

    type: str

    def validate_meeting(self, context: "WSContext") -> BaseModel | None:
        """Validate meeting is active (started and not ended).

        Override in subclasses if different validation needed.
        Default: checks meeting has started and hasn't ended.
        """
        from app.schema.websocket.responses import (
            MeetingEndedResponse,
            MeetingNotStartedResponse,
        )

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

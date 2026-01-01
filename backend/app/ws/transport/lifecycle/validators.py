"""Validators for WebSocket connection and meeting timing."""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from litestar import WebSocket

from app.models import Meeting
from app.schema.websocket import ErrorResponse, MeetingCountdownResponse, MeetingEndedResponse
from app.utils.datetime import ensure_utc, isoformat_utc

logger = logging.getLogger(__name__)


@dataclass
class MeetingTimingCheck:
    """Result of meeting timing validation."""

    allow_connection: bool
    countdown_response: MeetingCountdownResponse | None  # Sent if not started yet
    reject_response: MeetingEndedResponse | None  # Sent if ended (close connection)
    seconds_remaining: float


class MeetingTimingValidator:
    """Validates meeting timing at connection time."""

    def validate_connection(self, meeting: Meeting) -> MeetingTimingCheck:
        """Validate meeting timing at connection time.

        Returns:
        - allow_connection=False + reject_response: Meeting ended, close socket
        - allow_connection=True + countdown_response: Not started, send countdown but keep open
        - allow_connection=True + no response: Meeting active, proceed normally
        """
        now = datetime.now(tz=UTC)
        start_ts = ensure_utc(meeting.start_ts)
        end_ts = ensure_utc(meeting.end_ts)

        # Calculate time until meeting ends
        seconds_remaining = max(0, (end_ts - now).total_seconds())

        # Check if meeting has ended
        if now >= end_ts:
            logger.info("Meeting %s has ended", meeting.id)
            end_time = isoformat_utc(end_ts)
            return MeetingTimingCheck(
                allow_connection=False,
                countdown_response=None,
                reject_response=MeetingEndedResponse(
                    message=f"The meeting has already ended at {end_time}.",
                    end_time=end_time,
                ),
                seconds_remaining=0,
            )

        # Check if meeting hasn't started yet
        if now < start_ts:
            logger.info("Meeting %s not started, sending countdown", meeting.id)
            start_time = isoformat_utc(start_ts)
            return MeetingTimingCheck(
                allow_connection=True,
                countdown_response=MeetingCountdownResponse(
                    meeting_id=meeting.id,
                    start_time=start_time,
                    server_time=isoformat_utc(now),
                    city_name=meeting.city.name if meeting.city else None,
                    meeting_room_name=meeting.meeting_room.name if meeting.meeting_room else None,
                ),
                reject_response=None,
                seconds_remaining=seconds_remaining,
            )

        # Meeting is active
        logger.debug("Meeting %s is active", meeting.id)
        return MeetingTimingCheck(
            allow_connection=True,
            countdown_response=None,
            reject_response=None,
            seconds_remaining=seconds_remaining,
        )


class ConnectionValidator:
    """Validates WebSocket connections and sends appropriate responses."""

    def __init__(self, timing_validator: MeetingTimingValidator) -> None:
        """Initialize validator with timing validator.

        Args:
            timing_validator: Validator for meeting timing checks
        """
        self.timing_validator = timing_validator

    async def validate_and_send_response(
        self,
        meeting: Meeting | None,
        socket: WebSocket,
    ) -> tuple[Meeting | None, MeetingTimingCheck | None]:
        """Validate connection, send response if needed.

        Returns:
        - (None, None): Meeting not found, connection closed
        - (meeting, check): Meeting found, check contains timing info and optional response
        """
        # Check if meeting exists
        if not meeting:
            logger.warning("Meeting not found")
            await socket.send_json(
                ErrorResponse(message="Meeting not found").model_dump(mode="json")
            )
            await socket.close(code=4404, reason="Meeting not found")
            return None, None

        # Validate meeting timing
        check = self.timing_validator.validate_connection(meeting)

        # If connection not allowed (meeting ended), send response and close
        if not check.allow_connection:
            if check.reject_response:
                await socket.send_json(check.reject_response.model_dump(mode="json"))
            await socket.close(code=1000, reason="Meeting ended")
            return None, None

        # If countdown response needed (not started yet), send it but keep connection open
        if check.countdown_response:
            await socket.send_json(check.countdown_response.model_dump(mode="json"))

        return meeting, check

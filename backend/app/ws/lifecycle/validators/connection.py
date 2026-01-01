"""WebSocket connection validation."""

import logging

from litestar import WebSocket

from app.models import Meeting
from app.schema.websocket import ErrorResponse
from app.ws.lifecycle.validators.timing import MeetingTimingCheck, MeetingTimingValidator

logger = logging.getLogger(__name__)


class ConnectionValidator:
    """Validates WebSocket connections and sends appropriate responses."""

    def __init__(self, timing_validator: MeetingTimingValidator):
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

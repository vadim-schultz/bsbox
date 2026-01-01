"""Ping service for handling keepalive pings and activity tracking."""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel

from app.schema.websocket import PingRequest, PongResponse
from app.utils.datetime import isoformat_utc
from app.ws.transport.context import WSContext

logger = logging.getLogger(__name__)


class PingService:
    """Service for handling keepalive pings and activity tracking.

    Updates participant activity timestamps and returns server time for
    client-server time synchronization.
    """

    async def execute(self, request: PingRequest, context: WSContext) -> BaseModel:
        """Execute ping request - update activity and return pong.

        Args:
            request: Validated ping request (may include client timestamp)
            context: WebSocket connection context

        Returns:
            PongResponse with current server time
        """
        now = datetime.now(tz=UTC)

        # Update activity timestamp if participant exists
        if context.participant:
            context.participant.last_seen_at = now

        return PongResponse(server_time=isoformat_utc(now))

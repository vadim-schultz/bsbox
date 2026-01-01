"""Status service for handling participant status updates."""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel

from app.schema.engagement.messages import DeltaMessageData
from app.schema.websocket import ErrorResponse, StatusUpdateRequest
from app.services import EngagementService
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.transport.context import WSContext

logger = logging.getLogger(__name__)


class StatusService:
    """Service for handling participant engagement status updates.

    Records status changes and broadcasts deltas to all meeting subscribers
    for real-time engagement tracking.
    """

    def __init__(
        self,
        engagement_service: EngagementService,
        broadcast_repo: BroadcastRepo,
    ) -> None:
        """Initialize status service with dependencies.

        Args:
            engagement_service: Service for engagement calculations
            broadcast_repo: Repository for broadcasting to channels
        """
        self.engagement_service = engagement_service
        self.broadcast_repo = broadcast_repo

    async def execute(self, request: StatusUpdateRequest, context: WSContext) -> BaseModel | None:
        """Execute status update request - record and broadcast delta.

        Args:
            request: Validated status update request
            context: WebSocket connection context

        Returns:
            None (delta is broadcast via channel), or ErrorResponse on failure
        """
        # Participant must exist (validated before calling execute)
        if not context.participant:
            return ErrorResponse(message="Not joined")

        logger.info(
            "WS status update meeting_id=%s participant_id=%s status=%s",
            context.meeting.id,
            context.participant.id,
            request.status,
        )

        now = datetime.now(tz=UTC)
        try:
            bucket = self.engagement_service.record_status(
                participant=context.participant,
                status=request.status,
                current_time=now,
            )
        except ValueError as e:
            # Bucket validation failed (outside meeting bounds)
            logger.warning("Status record failed for meeting %s: %s", context.meeting.id, e)
            return ErrorResponse(message=str(e))

        # Commit immediately to release database lock
        context.session.commit()

        # Build and broadcast delta to all subscribers
        rollup = self.engagement_service.bucket_rollup(
            meeting=context.meeting,
            bucket=bucket,
        )
        delta_data = DeltaMessageData(
            meeting_id=context.meeting.id,
            participant_id=context.participant.id,
            bucket=bucket,
            status=request.status,
            overall=rollup["overall"],
            participants=rollup["participants"],
        )
        self.broadcast_repo.publish_delta(context.meeting.id, delta_data)

        # Update activity timestamp
        context.participant.last_seen_at = now

        # No direct response - delta is broadcast via channel
        return None

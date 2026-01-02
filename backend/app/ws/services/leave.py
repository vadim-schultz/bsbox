"""Leave service for handling participant leave/disconnect logic."""

import logging
from datetime import UTC, datetime

from app.services import EngagementService
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.transport.context import WSContext

logger = logging.getLogger(__name__)


class LeaveService:
    """Service for handling participant leave/disconnect operations.

    Updates participant state and broadcasts deltas to notify remaining
    participants when someone leaves the meeting.
    """

    def __init__(
        self,
        engagement_service: EngagementService,
        broadcast_repo: BroadcastRepo,
    ) -> None:
        """Initialize leave service with dependencies.

        Args:
            engagement_service: Service for engagement calculations
            broadcast_repo: Repository for broadcasting to channels
        """
        self.engagement_service = engagement_service
        self.broadcast_repo = broadcast_repo

    def handle_leave(self, context: WSContext) -> None:
        """Handle participant leave - update state and broadcast delta.

        Args:
            context: WebSocket connection context with participant and meeting info
        """
        if not context.participant:
            return  # No participant to process leave for

        try:
            # Update participant's last_seen_at timestamp
            now = datetime.now(tz=UTC)
            context.participant.last_seen_at = now

            # Broadcast delta to notify others of the leave
            bucket = self.engagement_service.bucket_manager.bucketize(now)
            self.broadcast_repo.publish_rollup(context.meeting, bucket, self.engagement_service)

            logger.info(
                "Participant %s left meeting %s, delta broadcast to others",
                context.participant.id,
                context.meeting.id,
            )
        except Exception as e:
            logger.exception("Error handling participant leave: %s", e)

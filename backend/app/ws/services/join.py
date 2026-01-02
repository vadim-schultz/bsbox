"""Join service for handling participant join logic."""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel

from app.schema.websocket import ErrorResponse, JoinedResponse, JoinRequest
from app.services import EngagementService, ParticipantService
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.transport.context import WSContext

logger = logging.getLogger(__name__)


class JoinService:
    """Service for handling participant join operations.

    Creates or reuses participants for WebSocket connections and broadcasts
    engagement snapshots to all meeting subscribers.
    """

    def __init__(
        self,
        participant_service: ParticipantService,
        engagement_service: EngagementService,
        broadcast_repo: BroadcastRepo,
    ) -> None:
        """Initialize join service with dependencies.

        Args:
            participant_service: Service for participant operations
            engagement_service: Service for engagement calculations
            broadcast_repo: Repository for broadcasting to channels
        """
        self.participant_service = participant_service
        self.engagement_service = engagement_service
        self.broadcast_repo = broadcast_repo

    async def execute(self, request: JoinRequest, context: WSContext) -> BaseModel:
        """Execute join request - create participant and broadcast snapshot.

        Args:
            request: Validated join request with device fingerprint
            context: WebSocket connection context

        Returns:
            JoinedResponse with participant and meeting IDs, or ErrorResponse on failure
        """
        try:
            # Create or reuse participant for this connection
            participant = self.participant_service.create_or_reuse_for_connection(
                context.meeting, request.fingerprint
            )

            # Commit immediately to release the database lock for other connections
            context.session.commit()
            context.set_participant(participant)

            logger.info(
                "Joined participant %s for meeting %s (fingerprint=%s)",
                participant.id,
                context.meeting.id,
                request.fingerprint,
            )

            # Build and broadcast snapshot so all clients receive it
            summary = self.engagement_service.build_engagement_summary(context.meeting)
            self.broadcast_repo.publish(context.meeting.id, summary)

            logger.info("Published snapshot for meeting %s", context.meeting.id)

            # Always broadcast delta for join event
            now = datetime.now(tz=UTC)
            bucket = self.engagement_service.bucket_manager.bucketize(now)
            self.broadcast_repo.publish_rollup(context.meeting, bucket, self.engagement_service)

            return JoinedResponse(
                participant_id=participant.id,
                meeting_id=context.meeting.id,
            )
        except Exception as e:
            logger.exception("Error in JoinService: %s", e)
            return ErrorResponse(message=f"Join failed: {str(e)}")

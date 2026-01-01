"""WebSocket message handlers: Join, Status, Ping."""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel

from app.schema.engagement.messages import DeltaMessage, DeltaMessageData
from app.schema.websocket import (
    ErrorResponse,
    JoinedResponse,
    JoinRequest,
    PingRequest,
    PongResponse,
    SnapshotMessage,
    StatusUpdateRequest,
)
from app.services import EngagementService, ParticipantService
from app.utils.datetime import isoformat_utc
from app.ws.context import WSContext

logger = logging.getLogger(__name__)


class JoinHandler:
    """Handle participant join - creates new participant per connection."""

    def __init__(
        self, participant_service: ParticipantService, engagement_service: EngagementService
    ) -> None:
        self.participant_service = participant_service
        self.engagement_service = engagement_service

    async def execute(self, request: JoinRequest, context: WSContext) -> BaseModel:
        """Execute join request - already validated."""
        try:
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

            # Build and broadcast snapshot via channel so all clients receive it
            summary = self.engagement_service.build_engagement_summary(context.meeting)
            snapshot_msg = SnapshotMessage(data=summary)
            context.channels.publish(
                data=snapshot_msg.model_dump_json(),
                channels=[f"meeting:{context.meeting.id}"],
            )
            logger.info("Published snapshot for meeting %s", context.meeting.id)

            return JoinedResponse(
                participant_id=participant.id,
                meeting_id=context.meeting.id,
            )
        except Exception as e:
            logger.exception("Error in JoinHandler: %s", e)
            return ErrorResponse(message=f"Join failed: {str(e)}")


class StatusHandler:
    """Handle participant status updates."""

    def __init__(self, engagement_service: EngagementService) -> None:
        self.engagement_service = engagement_service

    async def execute(self, request: StatusUpdateRequest, context: WSContext) -> BaseModel | None:
        """Execute status update request - already validated."""
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

        # Build and publish delta to all subscribers using Pydantic model
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
        delta = DeltaMessage(data=delta_data)
        context.channels.publish(
            data=delta.model_dump_json(),
            channels=[f"meeting:{context.meeting.id}"],
        )

        # Update activity timestamp
        context.participant.last_seen_at = now

        # No direct response - delta is broadcast via channel
        return None


class PingHandler:
    """Handle keepalive pings and activity tracking."""

    async def execute(self, request: PingRequest, context: WSContext) -> BaseModel:
        """Execute ping request - already validated."""
        now = datetime.now(tz=UTC)

        # Update activity timestamp if participant exists
        if context.participant:
            context.participant.last_seen_at = now

        return PongResponse(server_time=isoformat_utc(now))

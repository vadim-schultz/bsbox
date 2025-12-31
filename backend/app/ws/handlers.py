"""WebSocket message handlers: Join, Status, Ping."""

import json
from datetime import UTC, datetime
from typing import Any

from app.models import Meeting
from app.services import EngagementService, ParticipantService
from app.ws.types import (
    ErrorResponse,
    JoinedResponse,
    PongResponse,
    WSContext,
    WSResponse,
)


def _is_meeting_active(meeting: Meeting) -> bool:
    """Check if meeting is currently active (not ended)."""
    now = datetime.now(tz=UTC)
    end_ts = meeting.end_ts.replace(tzinfo=UTC) if meeting.end_ts.tzinfo is None else meeting.end_ts
    return now < end_ts


def _build_delta_message(
    meeting: Meeting,
    participant_id: str,
    bucket: datetime,
    status: str,
    rollup: dict[str, Any],
) -> dict[str, Any]:
    """Build delta message for channel broadcast."""
    return {
        "type": "delta",
        "data": {
            "meeting_id": meeting.id,
            "participant_id": participant_id,
            "bucket": bucket.isoformat(),
            "status": status,
            "overall": rollup["overall"],
            "participants": rollup["participants"],
        },
    }


class JoinHandler:
    """Handle participant join - creates new participant per connection."""

    def __init__(
        self, participant_service: ParticipantService, engagement_service: EngagementService
    ) -> None:
        self.participant_service = participant_service
        self.engagement_service = engagement_service

    async def handle(self, context: WSContext, message: dict[str, Any]) -> WSResponse:
        """Handle join request."""
        import logging
        logger = logging.getLogger(__name__)

        if context.participant:
            return ErrorResponse(message="Already joined")

        if not _is_meeting_active(context.meeting):
            return ErrorResponse(message="Meeting has ended")

        fingerprint = (message.get("fingerprint") or "").strip()
        if not fingerprint:
            return ErrorResponse(message="Missing device fingerprint")

        try:
            participant = self.participant_service.create_or_reuse_for_connection(
                context.meeting, fingerprint
            )
            # Commit immediately to release the database lock for other connections
            context.session.commit()
            context.set_participant(participant)
            logger.info(
                "Joined participant %s for meeting %s (fingerprint=%s)",
                participant.id,
                context.meeting.id,
                fingerprint,
            )

            # Build and broadcast snapshot via channel so all clients receive it
            summary = self.engagement_service.build_engagement_summary(context.meeting)
            snapshot_msg = {"type": "snapshot", "data": summary.model_dump(mode="json")}
            context.channels.publish(
                data=json.dumps(snapshot_msg),
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

    async def handle(self, context: WSContext, message: dict[str, Any]) -> WSResponse | None:
        """Handle status change request."""
        if not context.participant:
            return ErrorResponse(message="Not joined")

        if not _is_meeting_active(context.meeting):
            return ErrorResponse(message="Meeting has ended")

        status = message.get("status")
        if status not in ("speaking", "engaged", "disengaged"):
            return ErrorResponse(message="Invalid status")

        now = datetime.now(tz=UTC)
        bucket = self.engagement_service.record_status(
            participant=context.participant,
            status=status,
            current_time=now,
        )
        # Commit immediately to release database lock
        context.session.commit()

        # Build and publish delta to all subscribers
        rollup = self.engagement_service.bucket_rollup(
            meeting=context.meeting,
            bucket=bucket,
        )
        delta = _build_delta_message(
            context.meeting,
            context.participant.id,
            bucket,
            status,
            rollup,
        )
        context.channels.publish(
            data=json.dumps(delta),
            channels=[f"meeting:{context.meeting.id}"],
        )

        # Update activity timestamp
        context.participant.last_seen_at = now

        # No direct response - delta is broadcast via channel
        return None


class PingHandler:
    """Handle keepalive pings and activity tracking."""

    async def handle(self, context: WSContext, message: dict[str, Any]) -> WSResponse:
        """Handle ping request."""
        now = datetime.now(tz=UTC)

        # Update activity timestamp if participant exists
        if context.participant:
            context.participant.last_seen_at = now

        return PongResponse(server_time=now.isoformat())

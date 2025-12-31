"""WebSocket message handlers: Join, Status, Ping."""

import json
import logging
from datetime import UTC, datetime
from typing import Any

from app.models import Meeting
from app.services import EngagementService, ParticipantService
from app.utils.datetime import ensure_utc, isoformat_utc
from app.ws.types import (
    ErrorResponse,
    JoinedResponse,
    MeetingEndedResponse,
    MeetingNotStartedResponse,
    PongResponse,
    WSContext,
    WSResponse,
)

logger = logging.getLogger(__name__)


def _is_meeting_active(meeting: Meeting) -> bool:
    """Check if meeting is currently active (not ended)."""
    now = datetime.now(tz=UTC)
    end_ts = ensure_utc(meeting.end_ts)
    return now < end_ts


def _is_meeting_started(meeting: Meeting) -> bool:
    """Check if meeting has started."""
    now = datetime.now(tz=UTC)
    start_ts = ensure_utc(meeting.start_ts)
    return now >= start_ts


def _meeting_time_status(meeting: Meeting) -> tuple[bool, bool]:
    """Check meeting timing status.

    Returns:
        (has_started, has_ended) tuple
    """
    now = datetime.now(tz=UTC)
    start_ts = ensure_utc(meeting.start_ts)
    end_ts = ensure_utc(meeting.end_ts)
    return (now >= start_ts, now >= end_ts)


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
            "bucket": isoformat_utc(bucket),
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
        if context.participant:
            return ErrorResponse(message="Already joined")

        # Check meeting timing
        has_started, has_ended = _meeting_time_status(context.meeting)

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

        # Check meeting timing
        has_started, has_ended = _meeting_time_status(context.meeting)

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

        status = message.get("status")
        if status not in ("speaking", "engaged", "disengaged"):
            return ErrorResponse(message="Invalid status")

        logger.info(
            "WS status update meeting_id=%s participant_id=%s status=%s",
            context.meeting.id,
            context.participant.id,
            status,
        )

        now = datetime.now(tz=UTC)
        try:
            bucket = self.engagement_service.record_status(
                participant=context.participant,
                status=status,
                current_time=now,
            )
        except ValueError as e:
            # Bucket validation failed (outside meeting bounds)
            logger.warning("Status record failed for meeting %s: %s", context.meeting.id, e)
            return ErrorResponse(message=str(e))

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

        return PongResponse(server_time=isoformat_utc(now))

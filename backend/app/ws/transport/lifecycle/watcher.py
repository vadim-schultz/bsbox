"""Watcher for meeting end and connection closure."""

import contextlib
import logging
from typing import Literal, cast

import anyio
from litestar import WebSocket

from app.models import Meeting
from app.schema.websocket import MeetingSummaryResponse
from app.services import MeetingSummaryService
from app.utils.datetime import ensure_utc, isoformat_utc
from app.ws.repos.broadcast import BroadcastRepo

logger = logging.getLogger(__name__)


class MeetingEndWatcher:
    """Watches for meeting end and closes WebSocket connection."""

    def __init__(
        self,
        meeting_summary_service: MeetingSummaryService,
        broadcast_repo: BroadcastRepo,
    ) -> None:
        """Initialize watcher with required services.

        Args:
            meeting_summary_service: Service for computing and persisting meeting summaries
            broadcast_repo: Repository for broadcasting messages
        """
        self.meeting_summary_service = meeting_summary_service
        self.broadcast_repo = broadcast_repo

    async def watch(
        self,
        meeting: Meeting,
        socket: WebSocket,
        is_closed: anyio.Event,
        seconds_remaining: float,
    ) -> None:
        """Watch for meeting end and close connection.

        Args:
            meeting: Meeting to watch
            socket: WebSocket connection to close
            is_closed: Event to signal when connection is closed
            seconds_remaining: Seconds until meeting ends
        """
        logger.debug(
            "Starting meeting end watcher for %s (%.1fs remaining)", meeting.id, seconds_remaining
        )

        # Sleep until meeting ends
        await anyio.sleep(seconds_remaining)

        # If connection already closed, nothing to do
        if is_closed.is_set():
            return

        logger.info("Meeting %s ended, generating summary", meeting.id)

        # Generate and broadcast summary (only first connection will compute it)
        with contextlib.suppress(Exception):
            await self._generate_and_broadcast_summary(meeting)

        # Allow broadcast to propagate before closing the socket
        await anyio.sleep(0.05)

        # Signal that connection is closed and close socket gracefully
        is_closed.set()
        with contextlib.suppress(Exception):
            await socket.close(code=1000, reason="Meeting ended")

    async def _generate_and_broadcast_summary(self, meeting: Meeting) -> None:
        """Generate summary and broadcast to all connections.

        Args:
            meeting: The meeting that ended
        """
        # Compute and persist summary (or get cached if already exists)
        logger.info("Computing summary for meeting %s", meeting.id)
        summary = self.meeting_summary_service.persist_summary(meeting)

        # Build response with all meeting metadata
        start_ts = isoformat_utc(ensure_utc(meeting.start_ts))
        end_ts = isoformat_utc(ensure_utc(meeting.end_ts))
        duration_minutes = int((meeting.end_ts - meeting.start_ts).total_seconds() / 60)

        response = MeetingSummaryResponse(
            meeting_id=meeting.id,
            city_name=meeting.city.name if meeting.city else None,
            meeting_room_name=meeting.meeting_room.name if meeting.meeting_room else None,
            ms_teams_invite_url=(
                meeting.ms_teams_meeting.invite_url if meeting.ms_teams_meeting else None
            ),
            start_ts=start_ts,
            end_ts=end_ts,
            duration_minutes=duration_minutes,
            max_participants=summary.max_participants,
            normalized_engagement=summary.normalized_engagement,
            engagement_level=cast(
                Literal["high", "healthy", "passive", "low"], summary.engagement_level
            ),
        )

        # Broadcast to ALL connections for this meeting
        logger.info("Broadcasting summary for meeting %s", meeting.id)
        self.broadcast_repo.send_to_meeting(meeting.id, response.model_dump(mode="json"))

"""Periodic broadcaster for engagement updates."""

import asyncio
import contextlib
import logging
from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import Meeting
from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.schema.websocket import MeetingStartedResponse
from app.services import EngagementService
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing.base import SmoothingStrategy
from app.services.engagement.summary import SnapshotBuilder
from app.ws.repos.broadcast import BroadcastRepo

logger = logging.getLogger(__name__)


class PeriodicBroadcaster:
    """Background service for periodic engagement broadcasts.

    Broadcasts engagement rollups for active meetings at regular intervals,
    providing continuous state updates to all connected clients.
    """

    def __init__(
        self,
        session_factory: Callable[[], Session],
        broadcast_repo: BroadcastRepo,
        bucket_manager: BucketManager,
        smoothing_strategy: SmoothingStrategy,
        interval_seconds: int = 10,
    ) -> None:
        """Initialize periodic broadcaster.

        Args:
            session_factory: Factory function to create database sessions
            broadcast_repo: Repository for broadcasting messages
            bucket_manager: Manager for time bucketing
            smoothing_strategy: Strategy for smoothing engagement data
            interval_seconds: Broadcast interval in seconds
        """
        self.session_factory = session_factory
        self.broadcast_repo = broadcast_repo
        self.bucket_manager = bucket_manager
        self.smoothing_strategy = smoothing_strategy
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._notified_started_meetings: set[str] = (
            set()
        )  # Track meetings we've notified as started

    async def start(self) -> None:
        """Start periodic broadcasting task."""
        self._task = asyncio.create_task(self._broadcast_loop())
        logger.info("Periodic broadcaster started (interval=%ds)", self.interval_seconds)

    async def stop(self) -> None:
        """Stop periodic broadcasting task."""
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            logger.info("Periodic broadcaster stopped")

    async def _broadcast_loop(self) -> None:
        """Main loop: broadcast rollups for active meetings every N seconds."""
        while True:
            try:
                await asyncio.sleep(self.interval_seconds)
                await self._broadcast_active_meetings()
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Error in periodic broadcaster")

    async def _broadcast_active_meetings(self) -> None:
        """Query active meetings and broadcast rollups.

        Also notifies clients waiting in countdown mode when meetings start.
        """
        session = self.session_factory()
        try:
            # Create repos and services for this broadcast cycle
            meeting_repo = MeetingRepo(session)
            participant_repo = ParticipantRepo(session)
            engagement_repo = EngagementRepo(session)

            snapshot_builder = SnapshotBuilder(
                engagement_repo=engagement_repo,
                participant_repo=participant_repo,
                bucket_manager=self.bucket_manager,
                smoothing_strategy=self.smoothing_strategy,
            )

            engagement_service = EngagementService(
                engagement_repo=engagement_repo,
                participant_repo=participant_repo,
                bucket_manager=self.bucket_manager,
                snapshot_builder=snapshot_builder,
            )

            # Get active meetings (has_started and not has_ended)
            now = datetime.now(tz=UTC)
            active_meetings = meeting_repo.get_active_meetings(now)

            for meeting in active_meetings:
                try:
                    # Check if meeting just started (wasn't in our set yet)
                    if meeting.id not in self._notified_started_meetings:
                        self._notify_meeting_started(meeting)
                        self._notified_started_meetings.add(meeting.id)

                    # Broadcast regular rollup
                    self._broadcast_meeting_rollup(meeting, now, engagement_service)
                except Exception:
                    logger.exception("Failed to broadcast rollup for meeting %s", meeting.id)
        finally:
            session.close()

    def _notify_meeting_started(self, meeting: Meeting) -> None:
        """Notify clients waiting in countdown mode that the meeting has started.

        Args:
            meeting: The meeting that just started
        """
        logger.info("Meeting %s started, notifying countdown clients", meeting.id)
        response = MeetingStartedResponse(meeting_id=meeting.id, message="The meeting has started.")
        self.broadcast_repo.send_to_meeting(meeting.id, response.model_dump(mode="json"))

    def _broadcast_meeting_rollup(
        self, meeting: Meeting, now: datetime, engagement_service: EngagementService
    ) -> None:
        """Broadcast engagement rollup for a single meeting.

        Args:
            meeting: The meeting to broadcast rollup for
            now: Current timestamp
            engagement_service: Service for computing engagement rollups
        """
        bucket = engagement_service.bucket_manager.bucketize(now)
        self.broadcast_repo.publish_rollup(meeting, bucket, engagement_service)

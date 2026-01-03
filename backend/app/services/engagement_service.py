from datetime import datetime
from typing import Any

from app.models import Meeting, Participant
from app.repos import EngagementRepo, ParticipantRepo
from app.schema.engagement.models import EngagementSummary
from app.schema.websocket.requests import StatusUpdateRequest
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.summary import SnapshotBuilder


class EngagementService:
    """Main orchestrator for engagement operations."""

    def __init__(
        self,
        engagement_repo: EngagementRepo,
        participant_repo: ParticipantRepo,
        bucket_manager: BucketManager,
        snapshot_builder: SnapshotBuilder,
    ) -> None:
        self.engagement_repo = engagement_repo
        self.participant_repo = participant_repo
        self.bucket_manager = bucket_manager
        self.snapshot_builder = snapshot_builder

    def record_status(
        self, participant: Participant, request: StatusUpdateRequest, current_time: datetime
    ) -> datetime:
        """Record a status update for a participant.

        Args:
            participant: The participant recording the status
            request: The status update request containing the status
            current_time: The current timestamp

        Returns:
            The bucketed timestamp

        Raises:
            ValueError: If the bucketed time is outside meeting bounds
        """
        bucket = self.bucket_manager.bucketize(current_time)

        # Validate bucket is within meeting time bounds
        meeting = participant.meeting
        meeting_start = self.bucket_manager.bucketize(meeting.start_ts)
        meeting_end = self.bucket_manager.bucketize(meeting.end_ts)
        self.bucket_manager.validate_bucket_in_meeting(bucket, meeting_start, meeting_end)

        self.engagement_repo.upsert_sample(
            meeting_id=participant.meeting_id,
            participant_id=participant.id,
            bucket=bucket,
            request=request,
        )
        self.participant_repo.update_last_status(participant, request.status)
        return bucket

    def build_engagement_summary(
        self, meeting: Meeting, bucket_minutes: int = 1, window_minutes: int = 5
    ) -> EngagementSummary:
        """Build complete engagement summary for a meeting.

        Args:
            meeting: The meeting to build summary for
            bucket_minutes: Bucket size in minutes (default: 1)
            window_minutes: Window size for smoothing (default: 5)

        Returns:
            Complete engagement summary with all participants and buckets
        """
        return self.snapshot_builder.build_engagement_summary(
            meeting, bucket_minutes, window_minutes
        )

    def bucket_rollup(
        self, meeting: Meeting, bucket: datetime, window_minutes: int = 5
    ) -> dict[str, Any]:
        """Compute engagement rollup for a specific bucket.

        Used for real-time updates (periodic broadcasts and event-triggered updates).

        Args:
            meeting: The meeting to compute rollup for
            bucket: The bucket timestamp
            window_minutes: Window size for smoothing (default: 5)

        Returns:
            Dictionary with 'bucket', 'participants', and 'overall' keys
        """
        return self.snapshot_builder.bucket_rollup(meeting, bucket, window_minutes)

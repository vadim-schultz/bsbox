from datetime import datetime
from math import log2
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

    def build_engagement_summary(self, meeting: Meeting, bucket_minutes: int = 1) -> EngagementSummary:
        """Build complete engagement summary for a meeting.

        Args:
            meeting: The meeting to build summary for
            bucket_minutes: Bucket size in minutes (default: 1)

        Returns:
            Complete engagement summary with all participants and buckets
        """
        return self.snapshot_builder.build_engagement_summary(meeting, bucket_minutes)

    def bucket_rollup(self, meeting: Meeting, bucket: datetime) -> dict[str, Any]:
        """Compute engagement rollup for a specific bucket.

        Used for real-time updates (periodic broadcasts and event-triggered updates).

        Args:
            meeting: The meeting to compute rollup for
            bucket: The bucket timestamp

        Returns:
            Dictionary with 'bucket', 'participants', and 'overall' keys
        """
        return self.snapshot_builder.bucket_rollup(meeting, bucket)

    def compute_average_engagement(self, meeting: Meeting) -> float:
        """Compute average raw engagement score across all meeting buckets.

        Args:
            meeting: The meeting to compute engagement for

        Returns:
            Average raw engagement score (0.0 to 1.0)
        """
        summary = self.build_engagement_summary(meeting)
        if not summary.overall:
            return 0.0

        # Calculate mean of overall engagement values
        total = sum(point.value for point in summary.overall)
        return total / len(summary.overall)

    def normalize_engagement(
        self, raw_engagement: float, participant_count: int, alpha: float = 0.8
    ) -> float:
        """Apply size-aware normalization to raw engagement score.

        Formula: E_normalized = min(E × (1 + α / log2(N + 1)), E + 0.25, 1.0)

        Args:
            raw_engagement: Raw engagement score (0.0 to 1.0)
            participant_count: Number of participants
            alpha: Tuning constant (default: 0.8)

        Returns:
            Normalized engagement score (0.0 to 1.0)
        """
        if participant_count == 0:
            return 0.0

        # Apply normalization formula
        boost_factor = 1 + alpha / log2(participant_count + 1)
        normalized = raw_engagement * boost_factor

        # Apply safety cap: don't boost more than 0.25 above raw value
        return min(normalized, raw_engagement + 0.25, 1.0)

    def classify_engagement_level(self, normalized_engagement: float) -> str:
        """Classify normalized engagement into buckets.

        Args:
            normalized_engagement: Normalized engagement score (0.0 to 1.0)

        Returns:
            Engagement level: "high", "healthy", "passive", or "low"
        """
        if normalized_engagement >= 0.60:
            return "high"
        if normalized_engagement >= 0.40:
            return "healthy"
        if normalized_engagement >= 0.20:
            return "passive"
        return "low"

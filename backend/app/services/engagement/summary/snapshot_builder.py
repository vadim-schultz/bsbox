"""Snapshot builder for complete engagement summaries."""

from collections import defaultdict
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from app.models import Meeting
from app.repos import EngagementRepo, ParticipantRepo
from app.schema.engagement.models import (
    BucketRollup,
    EngagementPoint,
    EngagementSummary,
    ParticipantEngagementSeries,
)
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing.base import SmoothingStrategy
from app.utils.datetime import ensure_utc


class SnapshotBuilder:
    """Builds complete engagement snapshots for meetings."""

    def __init__(
        self,
        engagement_repo: EngagementRepo,
        participant_repo: ParticipantRepo,
        bucket_manager: BucketManager,
        smoothing_strategy: SmoothingStrategy,
    ) -> None:
        """Initialize snapshot builder with dependencies.

        Args:
            engagement_repo: Repository for engagement samples
            participant_repo: Repository for participants
            bucket_manager: Manager for time bucketing
            smoothing_strategy: Strategy for smoothing engagement data
        """
        self.engagement_repo = engagement_repo
        self.participant_repo = participant_repo
        self.bucket_manager = bucket_manager
        self.smoothing_strategy = smoothing_strategy

    @staticmethod
    def _engaged_value(status: str) -> int:
        """Convert status to binary engagement value.

        Args:
            status: Engagement status string

        Returns:
            1 if engaged, 0 otherwise
        """
        return 1 if status in {"speaking", "engaged"} else 0

    def _load_sample_map(
        self, meeting_id: str, start: datetime, end: datetime
    ) -> dict[str, dict[datetime, str]]:
        """Load engagement samples grouped by participant.

        Args:
            meeting_id: ID of the meeting
            start: Start timestamp
            end: End timestamp

        Returns:
            Map of participant_id -> bucket -> status
        """
        samples = self.engagement_repo.get_samples_for_meeting(meeting_id, start=start, end=end)
        result: dict[str, dict[datetime, str]] = defaultdict(dict)
        for sample in samples:
            # Normalize bucket to ensure consistent timestamp matching
            bucket_normalized = self.bucket_manager.bucketize(sample.bucket)
            result[sample.participant_id][bucket_normalized] = sample.status
        return result

    def _build_flags(
        self,
        buckets: list[datetime],
        participant_ids: Iterable[str],
        sample_map: dict[str, dict[datetime, str]],
        initial_status: dict[str, str],
    ) -> dict[str, list[int]]:
        """Build binary engagement flags for each participant.

        Args:
            buckets: List of bucket timestamps
            participant_ids: IDs of participants
            sample_map: Map of participant samples

        Returns:
            Map of participant_id -> list of binary flags (0 or 1)
        """
        flags: dict[str, list[int]] = {}
        for pid in participant_ids:
            pid_samples = sample_map.get(pid, {})
            last_status = initial_status.get(pid, "disengaged")
            pid_flags: list[int] = []
            for bucket in buckets:
                status = pid_samples.get(bucket, last_status)
                last_status = status
                pid_flags.append(self._engaged_value(status))
            flags[pid] = pid_flags
        return flags

    def _compose_participants_payload(
        self,
        buckets: list[datetime],
        participant_ids: list[str],
        participant_series: dict[str, list[float]],
        fingerprint_by_participant: dict[str, str],
    ) -> list[ParticipantEngagementSeries]:
        """Compose participant engagement series for output.

        Args:
            buckets: List of bucket timestamps
            participant_ids: IDs of participants
            participant_series: Map of smoothed engagement values
            fingerprint_by_participant: Map of device fingerprints

        Returns:
            List of participant engagement series
        """
        participants: list[ParticipantEngagementSeries] = []
        for pid in participant_ids:
            smoothed = participant_series.get(pid, [0.0] * len(buckets))
            series = [
                EngagementPoint(bucket=buckets[idx], value=smoothed[idx])
                for idx in range(len(buckets))
            ]
            participants.append(
                ParticipantEngagementSeries(
                    participant_id=pid,
                    device_fingerprint=fingerprint_by_participant.get(pid, ""),
                    series=series,
                )
            )
        return participants

    def _compose_overall(
        self, buckets: list[datetime], participant_series: dict[str, list[float]]
    ) -> list[EngagementPoint]:
        """Compose overall engagement series (average across participants).

        Args:
            buckets: List of bucket timestamps
            participant_series: Map of smoothed engagement values

        Returns:
            List of overall engagement points
        """
        overall: list[EngagementPoint] = []
        participant_ids = list(participant_series.keys())
        for idx, bucket in enumerate(buckets):
            if participant_ids:
                avg = sum(participant_series[pid][idx] for pid in participant_ids) / len(
                    participant_ids
                )
            else:
                avg = 0.0
            overall.append(EngagementPoint(bucket=bucket, value=avg))
        return overall

    def build_engagement_summary(
        self, meeting: Meeting, bucket_minutes: int = 1
    ) -> EngagementSummary:
        """Build complete engagement summary for a meeting.

        Args:
            meeting: The meeting to build summary for
            bucket_minutes: Bucket size in minutes

        Returns:
            Complete engagement summary with all participants and overall data
        """
        start = self.bucket_manager.bucketize(ensure_utc(meeting.start_ts))
        # Cap end time to current time to avoid generating future buckets
        current_time = datetime.now(tz=UTC)
        end = self.bucket_manager.bucketize(min(ensure_utc(meeting.end_ts), current_time))
        buckets = self.bucket_manager.generate_buckets(start, end, bucket_minutes)

        # Query participants fresh to include newly joined participants
        participants = self.participant_repo.get_for_meeting(meeting.id)
        participant_ids = [p.id for p in participants]
        sample_map = self._load_sample_map(meeting.id, start=start, end=end)
        initial_status = {p.id: p.last_status or "disengaged" for p in participants}
        flags = self._build_flags(buckets, participant_ids, sample_map, initial_status)

        # Apply smoothing to each participant's flags
        participant_series: dict[str, list[float]] = {}
        for pid, pid_flags in flags.items():
            smoothing_window = max(len(pid_flags), 1)
            participant_series[pid] = self.smoothing_strategy.smooth(pid_flags, smoothing_window)

        # Compose output
        fingerprint_by_participant = {p.id: p.device_fingerprint for p in participants}
        participants_payload = self._compose_participants_payload(
            buckets=buckets,
            participant_ids=participant_ids,
            participant_series=participant_series,
            fingerprint_by_participant=fingerprint_by_participant,
        )
        overall_points = self._compose_overall(buckets, participant_series)

        return EngagementSummary(
            meeting_id=meeting.id,
            start=start,
            end=end,
            bucket_minutes=bucket_minutes,
            participants=participants_payload,
            overall=overall_points,
        )

    def bucket_rollup(self, meeting: Meeting, bucket: datetime) -> dict[str, Any]:
        """Compute engagement rollup for a specific bucket using last known statuses."""
        bucket = self.bucket_manager.bucketize(bucket)

        # Query participants (includes historical entries)
        participants = self.participant_repo.get_for_meeting(meeting.id)
        participant_ids = [p.id for p in participants]

        # Seed with persisted last_status
        latest_status: dict[str, str] = {p.id: p.last_status or "disengaged" for p in participants}

        # Overlay with latest samples up to the bucket
        samples = self.engagement_repo.get_samples_for_meeting(meeting.id, end=bucket)
        for sample in samples:
            latest_status[sample.participant_id] = sample.status

        participant_values: dict[str, float] = {}
        for pid in participant_ids:
            status = latest_status.get(pid, "disengaged")
            participant_values[pid] = 100.0 if status in {"speaking", "engaged"} else 0.0

        overall_value = (
            sum(participant_values.values()) / len(participant_values)
            if participant_values
            else 0.0
        )

        rollup = BucketRollup(bucket=bucket, participants=participant_values, overall=overall_value)
        return dict(rollup.model_dump())

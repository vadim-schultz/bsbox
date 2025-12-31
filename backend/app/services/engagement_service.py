from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime, timedelta
from typing import Any

from app.models import Meeting, Participant
from app.repos import EngagementRepo, ParticipantRepo
from app.schema import (
    BucketRollup,
    EngagementPoint,
    EngagementSummary,
    ParticipantEngagementSeries,
)
from app.utils.datetime import ensure_utc


class EngagementService:
    def __init__(self, engagement_repo: EngagementRepo, participant_repo: ParticipantRepo) -> None:
        self.engagement_repo = engagement_repo
        self.participant_repo = participant_repo

    @staticmethod
    def _bucketize(ts: datetime) -> datetime:
        ts = ensure_utc(ts)
        return ts.replace(second=0, microsecond=0)

    @staticmethod
    def _engaged_value(status: str) -> int:
        return 1 if status in {"speaking", "engaged"} else 0

    def record_status(
        self, participant: Participant, status: str, current_time: datetime
    ) -> datetime:
        """Record a status update for a participant.

        Args:
            participant: The participant recording the status
            status: The engagement status to record
            current_time: The current timestamp

        Returns:
            The bucketed timestamp

        Raises:
            ValueError: If the bucketed time is outside meeting bounds
        """
        bucket = self._bucketize(current_time)

        # Validate bucket is within meeting time bounds
        meeting = participant.meeting
        meeting_start = self._bucketize(meeting.start_ts)
        meeting_end = self._bucketize(meeting.end_ts)

        if bucket < meeting_start:
            raise ValueError(
                f"Cannot record status before meeting start. "
                f"Bucket {bucket.isoformat()} is before start {meeting_start.isoformat()}"
            )

        if bucket > meeting_end:
            raise ValueError(
                f"Cannot record status after meeting end. "
                f"Bucket {bucket.isoformat()} is after end {meeting_end.isoformat()}"
            )

        self.engagement_repo.upsert_sample(
            meeting_id=participant.meeting_id,
            participant_id=participant.id,
            bucket=bucket,
            status=status,
        )
        self.participant_repo.update_last_status(participant, status)
        return bucket

    def _load_sample_map(
        self, meeting_id: str, start: datetime, end: datetime
    ) -> dict[str, dict[datetime, str]]:
        samples = self.engagement_repo.get_samples_for_meeting(meeting_id, start=start, end=end)
        result: dict[str, dict[datetime, str]] = defaultdict(dict)
        for sample in samples:
            # Normalize bucket to ensure consistent timestamp matching
            bucket_normalized = self._bucketize(sample.bucket)
            result[sample.participant_id][bucket_normalized] = sample.status
        return result

    def _build_flags(
        self,
        buckets: list[datetime],
        participant_ids: Iterable[str],
        sample_map: dict[str, dict[datetime, str]],
    ) -> dict[str, list[int]]:
        flags: dict[str, list[int]] = {}
        for pid in participant_ids:
            pid_samples = sample_map.get(pid, {})
            last_status = "disengaged"
            pid_flags: list[int] = []
            for bucket in buckets:
                status = pid_samples.get(bucket, last_status)
                last_status = status
                pid_flags.append(self._engaged_value(status))
            flags[pid] = pid_flags
        return flags

    @staticmethod
    def _smooth_flags(flags: list[int], _window: int) -> list[float]:
        """Convert binary flags to percentages without smoothing.

        Returns current engagement status (0% or 100%) for real-time tracking.
        The window parameter is kept for API compatibility but not used.
        """
        return [flag * 100.0 for flag in flags]

    @staticmethod
    def _generate_buckets(start: datetime, end: datetime, step_minutes: int) -> list[datetime]:
        buckets: list[datetime] = []
        current = start
        step = timedelta(minutes=step_minutes)
        while current <= end:
            buckets.append(current)
            current += step
        return buckets

    def _compose_participants_payload(
        self,
        buckets: list[datetime],
        participant_ids: list[str],
        participant_series: dict[str, list[float]],
        fingerprint_by_participant: dict[str, str],
    ) -> list[ParticipantEngagementSeries]:
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
        self, meeting: Meeting, bucket_minutes: int = 1, window_minutes: int = 5
    ) -> EngagementSummary:
        start = self._bucketize(meeting.start_ts)
        end = self._bucketize(meeting.end_ts)
        buckets = self._generate_buckets(start, end, bucket_minutes)

        # Query participants fresh to include newly joined participants
        participants = self.participant_repo.get_for_meeting(meeting.id)
        participant_ids = [p.id for p in participants]
        sample_map = self._load_sample_map(meeting.id, start=start, end=end)
        flags = self._build_flags(buckets, participant_ids, sample_map)

        participant_series: dict[str, list[float]] = {}
        for pid, pid_flags in flags.items():
            participant_series[pid] = self._smooth_flags(pid_flags, window_minutes)

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
            window_minutes=window_minutes,
            participants=participants_payload,
            overall=overall_points,
        )

    def bucket_rollup(
        self, meeting: Meeting, bucket: datetime, window_minutes: int = 5
    ) -> dict[str, Any]:
        bucket = self._bucketize(bucket)
        start = bucket - timedelta(minutes=window_minutes - 1)
        sample_map = self._load_sample_map(meeting.id, start=start, end=bucket)
        # Query participants fresh to include newly joined participants
        participants = self.participant_repo.get_for_meeting(meeting.id)
        participant_ids = [p.id for p in participants]
        buckets = [start + timedelta(minutes=i) for i in range(window_minutes)]
        flags = self._build_flags(buckets, participant_ids, sample_map)

        participant_values: dict[str, float] = {}
        for pid, pid_flags in flags.items():
            smoothed = self._smooth_flags(pid_flags, window_minutes)
            participant_values[pid] = smoothed[-1] if smoothed else 0.0

        overall_value = (
            sum(participant_values.values()) / len(participant_values)
            if participant_values
            else 0.0
        )

        rollup = BucketRollup(bucket=bucket, participants=participant_values, overall=overall_value)
        return dict(rollup.model_dump())

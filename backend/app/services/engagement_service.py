from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Tuple

from app.models import Meeting, Participant
from app.repos import EngagementRepo, ParticipantRepo


class EngagementService:
    def __init__(self, engagement_repo: EngagementRepo, participant_repo: ParticipantRepo) -> None:
        self.engagement_repo = engagement_repo
        self.participant_repo = participant_repo

    @staticmethod
    def _bucketize(ts: datetime) -> datetime:
        return ts.replace(second=0, microsecond=0)

    @staticmethod
    def _engaged_value(status: str) -> int:
        return 1 if status in {"speaking", "engaged"} else 0

    def record_status(self, participant: Participant, status: str, current_time: datetime) -> datetime:
        bucket = self._bucketize(current_time)
        self.engagement_repo.upsert_sample(
            meeting_id=participant.meeting_id,
            participant_id=participant.id,
            bucket=bucket,
            status=status,
            device_fingerprint=participant.device_fingerprint,
        )
        self.participant_repo.update_last_status(participant, status)
        return bucket

    def _load_sample_map(
        self, meeting_id: str, start: datetime, end: datetime
    ) -> Dict[str, Dict[datetime, str]]:
        samples = self.engagement_repo.get_samples_for_meeting(meeting_id, start=start, end=end)
        result: Dict[str, Dict[datetime, str]] = defaultdict(dict)
        for sample in samples:
            result[sample.participant_id][sample.bucket] = sample.status
        return result

    def _build_flags(
        self,
        buckets: List[datetime],
        participant_ids: Iterable[str],
        sample_map: Dict[str, Dict[datetime, str]],
    ) -> Dict[str, List[int]]:
        flags: Dict[str, List[int]] = {}
        for pid in participant_ids:
            pid_samples = sample_map.get(pid, {})
            last_status = "not_engaged"
            pid_flags: List[int] = []
            for bucket in buckets:
                status = pid_samples.get(bucket, last_status)
                last_status = status
                pid_flags.append(self._engaged_value(status))
            flags[pid] = pid_flags
        return flags

    @staticmethod
    def _smooth_flags(flags: List[int], window: int) -> List[float]:
        smoothed: List[float] = []
        for idx in range(len(flags)):
            window_slice = flags[max(0, idx - window + 1) : idx + 1]
            if not window_slice:
                smoothed.append(0.0)
            else:
                smoothed.append(sum(window_slice) / len(window_slice) * 100.0)
        return smoothed

    def build_engagement_summary(
        self, meeting: Meeting, bucket_minutes: int = 1, window_minutes: int = 5
    ) -> dict:
        start = self._bucketize(meeting.start_ts)
        end = self._bucketize(meeting.end_ts)
        buckets: List[datetime] = []
        current = start
        step = timedelta(minutes=bucket_minutes)
        while current <= end:
            buckets.append(current)
            current += step

        participant_ids = [p.id for p in meeting.participants]
        sample_map = self._load_sample_map(meeting.id, start=start, end=end)
        flags = self._build_flags(buckets, participant_ids, sample_map)

        participant_series = {}
        for pid, pid_flags in flags.items():
            participant_series[pid] = self._smooth_flags(pid_flags, window_minutes)

        overall: List[Tuple[datetime, float]] = []
        for idx, bucket in enumerate(buckets):
            if participant_ids:
                avg = sum(participant_series[pid][idx] for pid in participant_ids) / len(participant_ids)
            else:
                avg = 0.0
            overall.append((bucket, avg))

        participants_payload = []
        fingerprint_by_participant = {p.id: p.device_fingerprint for p in meeting.participants}
        for pid in participant_ids:
            series = [
                {"bucket": buckets[idx], "value": participant_series[pid][idx]} for idx in range(len(buckets))
            ]
            participants_payload.append(
                {
                    "participant_id": pid,
                    "device_fingerprint": fingerprint_by_participant.get(pid, ""),
                    "series": series,
                }
            )

        return {
            "meeting_id": meeting.id,
            "start": start,
            "end": end,
            "bucket_minutes": bucket_minutes,
            "window_minutes": window_minutes,
            "participants": participants_payload,
            "overall": [{"bucket": bucket, "value": value} for bucket, value in overall],
        }

    def bucket_rollup(self, meeting: Meeting, bucket: datetime, window_minutes: int = 5) -> dict:
        bucket = self._bucketize(bucket)
        start = bucket - timedelta(minutes=window_minutes - 1)
        sample_map = self._load_sample_map(meeting.id, start=start, end=bucket)
        participant_ids = [p.id for p in meeting.participants]
        buckets = [start + timedelta(minutes=i) for i in range(window_minutes)]
        flags = self._build_flags(buckets, participant_ids, sample_map)

        participant_values = {}
        for pid, pid_flags in flags.items():
            smoothed = self._smooth_flags(pid_flags, window_minutes)
            participant_values[pid] = smoothed[-1] if smoothed else 0.0

        overall_value = (
            sum(participant_values.values()) / len(participant_values) if participant_values else 0.0
        )

        return {
            "bucket": bucket,
            "participants": participant_values,
            "overall": overall_value,
        }

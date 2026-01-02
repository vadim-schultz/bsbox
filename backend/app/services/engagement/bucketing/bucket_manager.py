"""Bucket manager for time-based engagement grouping."""

from datetime import datetime, timedelta

from app.utils.datetime import ensure_utc


class BucketManager:
    """Handles time bucketing operations for engagement tracking."""

    @staticmethod
    def bucketize(ts: datetime) -> datetime:
        """Normalize timestamp to minute boundary.

        Args:
            ts: Timestamp to bucketize

        Returns:
            Timestamp rounded down to the minute
        """
        ts = ensure_utc(ts)
        return ts.replace(second=0, microsecond=0)

    @staticmethod
    def generate_buckets(start: datetime, end: datetime, step_minutes: int) -> list[datetime]:
        """Generate bucket timestamps from start to end.

        Args:
            start: Start timestamp (inclusive)
            end: End timestamp (inclusive)
            step_minutes: Step size in minutes

        Returns:
            List of bucket timestamps
        """
        step = timedelta(minutes=step_minutes)
        num_steps = int((end - start) / step) + 1
        return [start + step * i for i in range(num_steps)]

    @staticmethod
    def validate_bucket_in_meeting(
        bucket: datetime, meeting_start: datetime, meeting_end: datetime
    ) -> None:
        """Raise ValueError if bucket outside meeting bounds.

        Args:
            bucket: Bucket timestamp to validate
            meeting_start: Meeting start timestamp
            meeting_end: Meeting end timestamp

        Raises:
            ValueError: If bucket is outside meeting time bounds
        """
        if bucket < meeting_start:
            raise ValueError(
                f"Bucket {bucket.isoformat()} before meeting start {meeting_start.isoformat()}"
            )
        if bucket > meeting_end:
            raise ValueError(
                f"Bucket {bucket.isoformat()} after meeting end {meeting_end.isoformat()}"
            )

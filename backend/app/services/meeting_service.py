from datetime import UTC, datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo
from app.schema.common.pagination import PaginationParams
from app.schema.visit.requests import VisitRequest
from app.utils.datetime import ensure_tz, ensure_utc


class MeetingService:
    def __init__(self, meeting_repo: MeetingRepo) -> None:
        self.meeting_repo = meeting_repo

    @staticmethod
    def _snap_to_half_hour_local(ts: datetime) -> datetime:
        """Round a local datetime to the nearest 30-minute boundary, preserving tzinfo."""
        # Normalize to top of the minute
        ts = ts.replace(second=0, microsecond=0)
        minute = ts.minute

        if minute <= 15:
            snapped = ts.replace(minute=0)
        elif minute <= 44:
            snapped = ts.replace(minute=30)
        else:
            snapped = ts.replace(minute=0) + timedelta(hours=1)

        return snapped

    def ensure_meeting(
        self,
        now: datetime,
        request: VisitRequest,
    ) -> Meeting:
        """Get or create meeting for the current time slot using atomic UPSERT.

        Duration is set once at meeting creation and cannot be changed afterward.
        """
        # Use provided timezone (local) for snapping; caller supplies local-aware now
        local_now = ensure_tz(now, now.tzinfo or UTC)
        start_local = self._snap_to_half_hour_local(local_now)
        end_local = start_local + timedelta(minutes=request.duration_minutes)

        start_ts = ensure_utc(start_local)
        end_ts = ensure_utc(end_local)

        return self.meeting_repo.get_or_create(
            start_ts=start_ts,
            end_ts=end_ts,
            request=request,
        )

    def list_meetings(self, pagination: PaginationParams) -> tuple[list[Meeting], int]:
        items, total = self.meeting_repo.list(pagination)
        return list(items), total

    def get_meeting(self, meeting_id: str) -> Meeting | None:
        return self.meeting_repo.get_with_participants(meeting_id)

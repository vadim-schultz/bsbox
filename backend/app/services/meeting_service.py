from datetime import datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo


class MeetingService:
    def __init__(self, meeting_repo: MeetingRepo) -> None:
        self.meeting_repo = meeting_repo

    @staticmethod
    def _truncate_to_hour(ts: datetime) -> datetime:
        """Align meeting start to the current hour (never in the future)."""
        return ts.replace(minute=0, second=0, microsecond=0)

    def ensure_meeting_for_visit(self, now: datetime) -> Meeting:
        start_ts = self._truncate_to_hour(now)
        existing = self.meeting_repo.get_by_start(start_ts)
        if existing:
            return existing

        end_ts = start_ts + timedelta(hours=1)
        return self.meeting_repo.create(start_ts=start_ts, end_ts=end_ts)

    def list_meetings(self, page: int, page_size: int) -> tuple[list[Meeting], int]:
        items, total = self.meeting_repo.list(page=page, page_size=page_size)
        return list(items), total

    def get_meeting(self, meeting_id: str) -> Meeting | None:
        return self.meeting_repo.get_with_participants(meeting_id)

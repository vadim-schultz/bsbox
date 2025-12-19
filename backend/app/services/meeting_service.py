from datetime import datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo


class MeetingService:
    def __init__(self, meeting_repo: MeetingRepo) -> None:
        self.meeting_repo = meeting_repo

    @staticmethod
    def _round_to_nearest_hour(ts: datetime) -> datetime:
        base = ts.replace(minute=0, second=0, microsecond=0)
        if ts.minute >= 30:
            base += timedelta(hours=1)
        return base

    def ensure_meeting_for_visit(self, now: datetime) -> Meeting:
        start_ts = self._round_to_nearest_hour(now)
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

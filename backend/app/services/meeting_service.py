from datetime import datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo


class MeetingService:
    def __init__(self, meeting_repo: MeetingRepo) -> None:
        self.meeting_repo = meeting_repo

    @staticmethod
    def _ceil_to_quarter_hour(ts: datetime) -> datetime:
        """Round up to the top of the nearest 15-minute bucket."""
        remainder = ts.minute % 15
        minutes_to_add = (15 - remainder) % 15
        adjusted = ts + timedelta(minutes=minutes_to_add)
        return adjusted.replace(second=0, microsecond=0)

    def ensure_meeting_for_visit(
        self,
        now: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams_thread_id: str | None = None,
        ms_teams_meeting_id: str | None = None,
        ms_teams_invite_url: str | None = None,
    ) -> Meeting:
        start_ts = self._ceil_to_quarter_hour(now)
        existing = self.meeting_repo.get_by_start(start_ts)
        if existing:
            return self.meeting_repo.upsert_metadata(
                existing,
                city_id=city_id,
                meeting_room_id=meeting_room_id,
                ms_teams_thread_id=ms_teams_thread_id,
                ms_teams_meeting_id=ms_teams_meeting_id,
                ms_teams_invite_url=ms_teams_invite_url,
            )

        end_ts = start_ts + timedelta(hours=1)
        return self.meeting_repo.create(
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=city_id,
            meeting_room_id=meeting_room_id,
            ms_teams_thread_id=ms_teams_thread_id,
            ms_teams_meeting_id=ms_teams_meeting_id,
            ms_teams_invite_url=ms_teams_invite_url,
        )

    def list_meetings(self, page: int, page_size: int) -> tuple[list[Meeting], int]:
        items, total = self.meeting_repo.list(page=page, page_size=page_size)
        return list(items), total

    def get_meeting(self, meeting_id: str) -> Meeting | None:
        return self.meeting_repo.get_with_participants(meeting_id)

    def update_duration(self, meeting_id: str, duration_minutes: int) -> Meeting:
        meeting = self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise ValueError("Meeting not found")

        default_duration = timedelta(hours=1)
        current_duration = meeting.end_ts - meeting.start_ts
        if current_duration != default_duration:
            raise ValueError("Meeting duration already updated")

        new_end = meeting.start_ts + timedelta(minutes=duration_minutes)
        return self.meeting_repo.update_end(meeting, new_end)

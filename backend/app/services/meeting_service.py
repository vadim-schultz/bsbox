from datetime import datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo
from app.schema import PaginationParams, ParsedTeamsMeeting


class MeetingService:
    def __init__(self, meeting_repo: MeetingRepo) -> None:
        self.meeting_repo = meeting_repo

    @staticmethod
    def _snap_to_half_hour(ts: datetime) -> datetime:
        """Round to nearest 30-minute boundary.

        Decision boundaries at :15 and :45:
        - Minutes 0-15  -> :00 of current hour
        - Minutes 16-44 -> :30 of current hour
        - Minutes 45-59 -> :00 of next hour
        """
        minute = ts.minute
        base = ts.replace(second=0, microsecond=0)

        if minute <= 15:
            return base.replace(minute=0)
        if minute <= 44:
            return base.replace(minute=30)
        return base.replace(minute=0) + timedelta(hours=1)

    def ensure_meeting(
        self,
        now: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        """Get or create meeting for the current time slot using atomic UPSERT."""
        start_ts = self._snap_to_half_hour(now)
        end_ts = start_ts + timedelta(hours=1)

        return self.meeting_repo.upsert_by_start(
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=city_id,
            meeting_room_id=meeting_room_id,
            ms_teams=ms_teams,
        )

    def list_meetings(self, pagination: PaginationParams) -> tuple[list[Meeting], int]:
        items, total = self.meeting_repo.list(pagination)
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

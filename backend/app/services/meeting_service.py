from datetime import UTC, datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo
from app.schema import PaginationParams, ParsedTeamsMeeting
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

    @staticmethod
    def _to_utc(ts: datetime) -> datetime:
        """Convert aware/naive datetime to UTC aware for storage."""
        return ensure_utc(ts)

    def ensure_meeting(
        self,
        now: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        """Get or create meeting for the current time slot using atomic UPSERT."""
        # Use provided timezone (local) for snapping; caller supplies local-aware now
        local_now = ensure_tz(now, now.tzinfo or UTC)
        start_local = self._snap_to_half_hour_local(local_now)
        end_local = start_local + timedelta(hours=1)

        start_ts = self._to_utc(start_local)
        end_ts = self._to_utc(end_local)

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

from datetime import UTC, datetime, timedelta

from app.models import Meeting
from app.repos import MeetingRepo
from app.schema.common.pagination import PaginationParams
from app.schema.integration.parsers import ParsedTeamsMeeting
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
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
        duration_minutes: int = 60,
    ) -> Meeting:
        """Get or create meeting for the current time slot using atomic UPSERT.

        Duration is set once at meeting creation and cannot be changed afterward.
        """
        # Use provided timezone (local) for snapping; caller supplies local-aware now
        local_now = ensure_tz(now, now.tzinfo or UTC)
        start_local = self._snap_to_half_hour_local(local_now)
        end_local = start_local + timedelta(minutes=duration_minutes)

        start_ts = ensure_utc(start_local)
        end_ts = ensure_utc(end_local)

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

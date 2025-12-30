"""Repository for MS Teams meeting operations."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MSTeamsMeeting
from app.schema import ParsedTeamsMeeting


class MSTeamsMeetingRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_or_create(self, parsed: ParsedTeamsMeeting) -> MSTeamsMeeting | None:
        """Get existing or create new MSTeamsMeeting from parsed input.

        Returns None if the parsed input has no meaningful data.
        """
        if not parsed.thread_id and not parsed.meeting_id and not parsed.invite_url:
            return None

        # Try to find existing by thread_id or meeting_id
        if parsed.thread_id:
            stmt = select(MSTeamsMeeting).where(MSTeamsMeeting.thread_id == parsed.thread_id)
            existing = self.session.scalars(stmt).first()
            if existing:
                return existing

        if parsed.meeting_id:
            stmt = select(MSTeamsMeeting).where(MSTeamsMeeting.meeting_id == parsed.meeting_id)
            existing = self.session.scalars(stmt).first()
            if existing:
                return existing

        # Create new
        ms_teams_meeting = MSTeamsMeeting(
            thread_id=parsed.thread_id,
            meeting_id=parsed.meeting_id,
            invite_url=parsed.invite_url,
        )
        self.session.add(ms_teams_meeting)
        self.session.flush()
        return ms_teams_meeting

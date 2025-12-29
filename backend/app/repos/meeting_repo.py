from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Meeting
from app.schema import PaginationParams, ParsedTeamsMeeting


class MeetingRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, pagination: PaginationParams) -> tuple[Sequence[Meeting], int]:
        stmt = (
            select(Meeting)
            .options(
                selectinload(Meeting.city),
                selectinload(Meeting.meeting_room),
            )
            .order_by(Meeting.start_ts.desc())
            .offset((pagination.page - 1) * pagination.page_size)
            .limit(pagination.page_size)
        )
        items = self.session.scalars(stmt).all()
        total = self.session.scalar(select(func.count()).select_from(Meeting)) or 0
        return items, int(total)

    def get_with_participants(self, meeting_id: str) -> Meeting | None:
        from app.models import Participant  # local import to avoid cycle in typing

        stmt = (
            select(Meeting)
            .options(
                selectinload(Meeting.city),
                selectinload(Meeting.meeting_room),
                selectinload(Meeting.participants).selectinload(Participant.engagement_samples),
            )
            .where(Meeting.id == meeting_id)
        )
        return self.session.scalars(stmt).first()

    def get_by_id(self, meeting_id: str) -> Meeting | None:
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        return self.session.scalars(stmt).first()

    def get_by_start(self, start_ts: datetime) -> Meeting | None:
        stmt = select(Meeting).where(Meeting.start_ts == start_ts)
        return self.session.scalars(stmt).first()

    def create(
        self,
        start_ts: datetime,
        end_ts: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        meeting = Meeting(
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=city_id,
            meeting_room_id=meeting_room_id,
            ms_teams_meeting=ms_teams,
        )
        self.session.add(meeting)
        self.session.flush()
        self.session.refresh(meeting)
        return meeting

    def update_end(self, meeting: Meeting, end_ts: datetime) -> Meeting:
        meeting.end_ts = end_ts
        self.session.flush()
        self.session.refresh(meeting)
        return meeting

    def upsert_metadata(
        self,
        meeting: Meeting,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        updated = False
        if city_id and not meeting.city_id:
            meeting.city_id = city_id
            updated = True
        if meeting_room_id and not meeting.meeting_room_id:
            meeting.meeting_room_id = meeting_room_id
            updated = True
        if ms_teams:
            if ms_teams.thread_id and not meeting.ms_teams_thread_id:
                meeting.ms_teams_thread_id = ms_teams.thread_id
                updated = True
            if ms_teams.meeting_id and not meeting.ms_teams_meeting_id:
                meeting.ms_teams_meeting_id = ms_teams.meeting_id
                updated = True
            if ms_teams.invite_url and not meeting.ms_teams_invite_url:
                meeting.ms_teams_invite_url = ms_teams.invite_url
                updated = True

        if updated:
            self.session.flush()
            self.session.refresh(meeting)
        return meeting

import hashlib
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session, selectinload

from app.models import Meeting
from app.repos.ms_teams_meeting_repo import MSTeamsMeetingRepo
from app.schema import PaginationParams, ParsedTeamsMeeting


class MeetingRepo:
    def __init__(self, session: Session) -> None:
        self.session = session
        self._ms_teams_repo = MSTeamsMeetingRepo(session)

    @staticmethod
    def _generate_meeting_id(start_ts: datetime) -> str:
        """Generate deterministic meeting ID from time slot."""
        key = start_ts.isoformat()
        return hashlib.sha256(key.encode()).hexdigest()[:36]

    def list(self, pagination: PaginationParams) -> tuple[Sequence[Meeting], int]:
        stmt = (
            select(Meeting)
            .options(
                selectinload(Meeting.city),
                selectinload(Meeting.meeting_room),
                selectinload(Meeting.ms_teams_meeting),
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
                selectinload(Meeting.ms_teams_meeting),
                selectinload(Meeting.participants).selectinload(Participant.engagement_samples),
            )
            .where(Meeting.id == meeting_id)
        )
        return self.session.scalars(stmt).first()

    def get_by_id(self, meeting_id: str) -> Meeting | None:
        stmt = (
            select(Meeting)
            .options(selectinload(Meeting.ms_teams_meeting))
            .where(Meeting.id == meeting_id)
        )
        return self.session.scalars(stmt).first()

    def get_by_start(self, start_ts: datetime) -> Meeting | None:
        stmt = (
            select(Meeting)
            .options(selectinload(Meeting.ms_teams_meeting))
            .where(Meeting.start_ts == start_ts)
        )
        return self.session.scalars(stmt).first()

    def upsert_by_start(
        self,
        start_ts: datetime,
        end_ts: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        """Atomically get or create meeting for time slot using deterministic ID."""
        ms_teams_meeting = self._ms_teams_repo.get_or_create(ms_teams) if ms_teams else None
        ms_teams_meeting_id = ms_teams_meeting.id if ms_teams_meeting else None

        meeting_id = self._generate_meeting_id(start_ts)

        # Build the upsert statement
        stmt = insert(Meeting).values(
            id=meeting_id,
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=city_id,
            meeting_room_id=meeting_room_id,
            ms_teams_meeting_id=ms_teams_meeting_id,
        )

        # On conflict, update metadata only if new values are provided and existing are null
        stmt = stmt.on_conflict_do_update(
            index_elements=["start_ts"],
            set_={
                "city_id": func.coalesce(Meeting.city_id, stmt.excluded.city_id),
                "meeting_room_id": func.coalesce(
                    Meeting.meeting_room_id, stmt.excluded.meeting_room_id
                ),
                "ms_teams_meeting_id": func.coalesce(
                    Meeting.ms_teams_meeting_id, stmt.excluded.ms_teams_meeting_id
                ),
            },
        )

        self.session.execute(stmt)
        self.session.flush()

        # Fetch the meeting with relationships loaded
        return self.get_by_id(meeting_id)  # type: ignore[return-value]

    def create(
        self,
        start_ts: datetime,
        end_ts: datetime,
        *,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams: ParsedTeamsMeeting | None = None,
    ) -> Meeting:
        """Create a new meeting. Prefer upsert_by_start for race-condition safety."""
        ms_teams_meeting = self._ms_teams_repo.get_or_create(ms_teams) if ms_teams else None

        meeting = Meeting(
            id=self._generate_meeting_id(start_ts),
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=city_id,
            meeting_room_id=meeting_room_id,
            ms_teams_meeting_id=ms_teams_meeting.id if ms_teams_meeting else None,
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
        if ms_teams and not meeting.ms_teams_meeting_id:
            ms_teams_meeting = self._ms_teams_repo.get_or_create(ms_teams)
            if ms_teams_meeting:
                meeting.ms_teams_meeting_id = ms_teams_meeting.id
                updated = True

        if updated:
            self.session.flush()
            self.session.refresh(meeting)
        return meeting

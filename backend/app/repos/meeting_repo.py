import hashlib
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session, selectinload

from app.models import Meeting
from app.repos.ms_teams_meeting_repo import MSTeamsMeetingRepo
from app.schema.common.pagination import PaginationParams
from app.schema.visit.requests import VisitRequest
from app.utils.datetime import ensure_utc, isoformat_utc


class MeetingRepo:
    def __init__(self, session: Session) -> None:
        self.session = session
        self._ms_teams_repo = MSTeamsMeetingRepo(session)

    @staticmethod
    def _generate_meeting_id(
        start_ts: datetime, ms_teams_meeting_id: str | None, meeting_room_id: str | None
    ) -> str:
        """Generate deterministic meeting ID from time slot and context.

        Hierarchical logic:
        - If Teams meeting ID is provided, it's the primary identifier
        - Otherwise, room ID must be provided
        - Raises ValueError if neither is provided
        """
        key = isoformat_utc(start_ts)

        # Hierarchical: Teams link is primary, room is secondary
        if ms_teams_meeting_id:
            key = f"{key}|teams:{ms_teams_meeting_id}"
        elif meeting_room_id:
            key = f"{key}|room:{meeting_room_id}"
        else:
            raise ValueError("Meeting must have either Teams link or room")

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

    def get_or_create(
        self,
        start_ts: datetime,
        end_ts: datetime,
        request: VisitRequest,
    ) -> Meeting:
        """Get or create meeting using deterministic ID from context.

        The meeting ID is generated from start_ts and context (Teams or room).
        If a meeting with that ID exists, it's returned; otherwise, a new one is created.
        """
        ms_teams_meeting = (
            self._ms_teams_repo.get_or_create(request.ms_teams) if request.ms_teams else None
        )
        ms_teams_meeting_id = ms_teams_meeting.id if ms_teams_meeting else None

        start_ts = ensure_utc(start_ts)
        end_ts = ensure_utc(end_ts)

        # Generate meeting ID with hierarchical context (Teams > Room)
        meeting_id = self._generate_meeting_id(
            start_ts, ms_teams_meeting_id, request.meeting_room_id
        )

        # Simple upsert by ID (primary key) - no complex conflict logic needed
        stmt = insert(Meeting).values(
            id=meeting_id,
            start_ts=start_ts,
            end_ts=end_ts,
            city_id=request.city_id,
            meeting_room_id=request.meeting_room_id,
            ms_teams_meeting_id=ms_teams_meeting_id,
        )

        # On conflict with the primary key (id), update metadata if new values provided
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
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

    def get_active_meetings(self, current_time: datetime) -> Sequence[Meeting]:
        """Get meetings that are currently active (started but not ended).

        Args:
            current_time: Current timestamp to check against

        Returns:
            List of active meetings with participants loaded
        """
        current_time = ensure_utc(current_time)
        stmt = (
            select(Meeting)
            .options(selectinload(Meeting.participants))
            .where(Meeting.start_ts <= current_time)
            .where(Meeting.end_ts > current_time)
        )
        return self.session.scalars(stmt).all()

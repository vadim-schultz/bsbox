from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import MeetingRoom
from app.schema import PaginationParams


class MeetingRoomRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_by_city(
        self, city_id: str, pagination: PaginationParams
    ) -> tuple[Sequence[MeetingRoom], int]:
        # Count total for this city
        count_stmt = (
            select(func.count()).select_from(MeetingRoom).where(MeetingRoom.city_id == city_id)
        )
        total = self.session.scalar(count_stmt) or 0

        # Fetch page
        offset = (pagination.page - 1) * pagination.page_size
        stmt = (
            select(MeetingRoom)
            .where(MeetingRoom.city_id == city_id)
            .order_by(MeetingRoom.name.asc())
            .offset(offset)
            .limit(pagination.page_size)
        )
        items = self.session.scalars(stmt).all()

        return items, total

    def get_by_id(self, room_id: str) -> MeetingRoom | None:
        return self.session.get(MeetingRoom, room_id)

    def get_by_name(self, name: str, city_id: str) -> MeetingRoom | None:
        stmt = select(MeetingRoom).where(
            MeetingRoom.name == name,
            MeetingRoom.city_id == city_id,
        )
        return self.session.scalars(stmt).first()

    def exists(self, name: str, city_id: str) -> bool:
        return self.get_by_name(name=name, city_id=city_id) is not None

    def create(self, name: str, city_id: str) -> MeetingRoom:
        meeting_room = MeetingRoom(name=name, city_id=city_id)
        self.session.add(meeting_room)
        self.session.flush()
        self.session.refresh(meeting_room)
        return meeting_room

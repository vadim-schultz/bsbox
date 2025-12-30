from litestar import Controller, get, post
from litestar.exceptions import HTTPException

from app.schema import MeetingRoomCreate, MeetingRoomRead, Paginated, PaginationParams
from app.services import MeetingRoomService


class MeetingRoomsController(Controller):
    path = "/meeting-rooms"

    @get("/", sync_to_thread=False)
    def list_by_city(
        self,
        city_id: str | None,
        meeting_room_service: MeetingRoomService,
        pagination: PaginationParams | None = None,
    ) -> Paginated[MeetingRoomRead]:
        if not city_id:
            raise HTTPException(status_code=400, detail="city_id is required")
        pagination = pagination or PaginationParams(page=1, page_size=20)
        rooms, total = meeting_room_service.list_rooms_by_city(city_id, pagination)
        return Paginated[MeetingRoomRead](
            items=[MeetingRoomRead.model_validate(room) for room in rooms],
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
        )

    @post("/", sync_to_thread=False)
    def create_room(
        self, data: MeetingRoomCreate, meeting_room_service: MeetingRoomService
    ) -> MeetingRoomRead:
        try:
            room = meeting_room_service.create_room(name=data.name, city_id=data.city_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return MeetingRoomRead.model_validate(room)

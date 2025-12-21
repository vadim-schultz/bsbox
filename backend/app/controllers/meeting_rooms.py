from litestar import Controller, get, post
from litestar.exceptions import HTTPException

from app.schema import MeetingRoomRead, MeetingRoomCreate
from app.services import MeetingRoomService


class MeetingRoomsController(Controller):
    path = "/meeting-rooms"

    @get("/", sync_to_thread=False)
    def list_by_city(self, city_id: str | None, meeting_room_service: MeetingRoomService) -> list[MeetingRoomRead]:
        if not city_id:
            raise HTTPException(status_code=400, detail="city_id is required")
        rooms = meeting_room_service.list_rooms_by_city(city_id)
        return [MeetingRoomRead.model_validate(room) for room in rooms]

    @post("/", sync_to_thread=False)
    def create_room(self, data: MeetingRoomCreate, meeting_room_service: MeetingRoomService) -> MeetingRoomRead:
        try:
            room = meeting_room_service.create_room(name=data.name, city_id=data.city_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return MeetingRoomRead.model_validate(room)

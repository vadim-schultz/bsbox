from app.repos import CityRepo, MeetingRoomRepo


class MeetingRoomService:
    def __init__(self, meeting_room_repo: MeetingRoomRepo, city_repo: CityRepo) -> None:
        self.meeting_room_repo = meeting_room_repo
        self.city_repo = city_repo

    def list_rooms_by_city(self, city_id: str):
        return self.meeting_room_repo.list_by_city(city_id)

    def create_room(self, name: str, city_id: str):
        if not self.city_repo.get_by_id(city_id):
            raise ValueError("City not found")
        if self.meeting_room_repo.exists(name=name, city_id=city_id):
            raise ValueError("Meeting room already exists in this city")
        return self.meeting_room_repo.create(name=name, city_id=city_id)

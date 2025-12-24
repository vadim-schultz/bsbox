from litestar import Controller, get, post
from litestar.exceptions import HTTPException

from app.schema import CityCreate, CityRead
from app.services import CityService


class CitiesController(Controller):
    path = "/cities"

    @get("/", sync_to_thread=False)
    def list_cities(self, city_service: CityService) -> list[CityRead]:
        cities = city_service.list_cities()
        return [CityRead.model_validate(city) for city in cities]

    @post("/", sync_to_thread=False)
    def create_city(self, data: CityCreate, city_service: CityService) -> CityRead:
        try:
            city = city_service.create_city(data.name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return CityRead.model_validate(city)

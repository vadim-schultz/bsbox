from litestar import Controller, get, post
from litestar.exceptions import HTTPException

from app.schema import CityCreate, CityRead, Paginated, PaginationParams
from app.services import CityService


class CitiesController(Controller):
    path = "/cities"

    @get("/", sync_to_thread=False)
    def list_cities(
        self,
        city_service: CityService,
        pagination: PaginationParams | None = None,
    ) -> Paginated[CityRead]:
        pagination = pagination or PaginationParams(page=1, page_size=20)
        cities, total = city_service.list_cities(pagination)
        return Paginated[CityRead](
            items=[CityRead.model_validate(city) for city in cities],
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
        )

    @post("/", sync_to_thread=False)
    def create_city(self, data: CityCreate, city_service: CityService) -> CityRead:
        try:
            city = city_service.create_city(data.name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return CityRead.model_validate(city)


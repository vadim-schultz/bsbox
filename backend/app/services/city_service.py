from collections.abc import Sequence

from app.models import City
from app.repos import CityRepo
from app.schema.common.pagination import PaginationParams
from app.schema.location.requests import CityCreate


class CityService:
    def __init__(self, city_repo: CityRepo) -> None:
        self.city_repo = city_repo

    def list_cities(self, pagination: PaginationParams) -> tuple[Sequence[City], int]:
        return self.city_repo.list(pagination)

    def create_city(self, request: CityCreate) -> City:
        if self.city_repo.exists(request.name):
            raise ValueError("City already exists")
        return self.city_repo.create(request)

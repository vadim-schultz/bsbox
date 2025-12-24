from collections.abc import Sequence

from app.models import City
from app.repos import CityRepo


class CityService:
    def __init__(self, city_repo: CityRepo) -> None:
        self.city_repo = city_repo

    def list_cities(self, page: int = 1, page_size: int = 20) -> tuple[Sequence[City], int]:
        return self.city_repo.list(page=page, page_size=page_size)

    def create_city(self, name: str) -> City:
        if self.city_repo.exists(name):
            raise ValueError("City already exists")
        return self.city_repo.create(name)


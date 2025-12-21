from app.repos import CityRepo


class CityService:
    def __init__(self, city_repo: CityRepo) -> None:
        self.city_repo = city_repo

    def list_cities(self):
        return self.city_repo.list()

    def create_city(self, name: str):
        if self.city_repo.exists(name):
            raise ValueError("City already exists")
        return self.city_repo.create(name)

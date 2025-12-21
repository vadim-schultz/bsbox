from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import City


class CityRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self) -> list[City]:
        stmt = select(City).order_by(City.name.asc())
        return self.session.scalars(stmt).all()

    def get_by_id(self, city_id: str) -> City | None:
        return self.session.get(City, city_id)

    def get_by_name(self, name: str) -> City | None:
        stmt = select(City).where(City.name == name)
        return self.session.scalars(stmt).first()

    def exists(self, name: str) -> bool:
        return self.get_by_name(name) is not None

    def create(self, name: str) -> City:
        city = City(name=name)
        self.session.add(city)
        self.session.flush()
        self.session.refresh(city)
        return city

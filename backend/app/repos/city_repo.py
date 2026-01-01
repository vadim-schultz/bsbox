from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import City
from app.schema.common.pagination import PaginationParams


class CityRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, pagination: PaginationParams) -> tuple[Sequence[City], int]:
        # Count total
        count_stmt = select(func.count()).select_from(City)
        total = self.session.scalar(count_stmt) or 0

        # Fetch page
        offset = (pagination.page - 1) * pagination.page_size
        stmt = select(City).order_by(City.name.asc()).offset(offset).limit(pagination.page_size)
        items = self.session.scalars(stmt).all()

        return items, total

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

"""Location schemas for cities and meeting rooms."""

from app.schema.location.models import CityRead, MeetingRoomRead
from app.schema.location.requests import CityCreate, MeetingRoomCreate

__all__ = [
    "CityRead",
    "CityCreate",
    "MeetingRoomRead",
    "MeetingRoomCreate",
]

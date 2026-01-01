"""Location models - read schemas for cities and meeting rooms."""

from pydantic import BaseModel, ConfigDict


class CityRead(BaseModel):
    """Read schema for a city."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class MeetingRoomRead(BaseModel):
    """Read schema for a meeting room."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city_id: str

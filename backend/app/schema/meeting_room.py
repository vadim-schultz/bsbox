"""Meeting room-related schemas."""

from pydantic import BaseModel, ConfigDict, Field

from app.schema.base import NameValidatorMixin


class MeetingRoomRead(BaseModel):
    """Read schema for a meeting room."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city_id: str


class MeetingRoomCreate(NameValidatorMixin, BaseModel):
    """Schema for creating a new meeting room."""

    name: str = Field(..., min_length=1, max_length=128)
    city_id: str

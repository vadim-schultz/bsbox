"""Location request schemas for creating cities and meeting rooms."""

from pydantic import BaseModel, Field

from app.schema.common.base import NameValidatorMixin


class CityCreate(NameValidatorMixin, BaseModel):
    """Schema for creating a new city."""

    name: str = Field(..., min_length=1, max_length=128)


class MeetingRoomCreate(NameValidatorMixin, BaseModel):
    """Schema for creating a new meeting room."""

    name: str = Field(..., min_length=1, max_length=128)
    city_id: str

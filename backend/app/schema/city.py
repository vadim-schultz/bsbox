"""City-related schemas."""

from pydantic import BaseModel, ConfigDict, Field

from app.schema.base import NameValidatorMixin


class CityRead(BaseModel):
    """Read schema for a city."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class CityCreate(NameValidatorMixin, BaseModel):
    """Schema for creating a new city."""

    name: str = Field(..., min_length=1, max_length=128)


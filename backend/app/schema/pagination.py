"""Pagination-related schemas."""

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for paginated endpoints."""

    model_config = ConfigDict(from_attributes=True)

    page: int = Field(1, ge=1)
    page_size: Literal[20] = 20


class Paginated(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    model_config = ConfigDict(arbitrary_types_allowed=True, from_attributes=True)

    items: list[T]
    page: int
    page_size: int
    total: int

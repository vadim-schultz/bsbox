from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.meeting import MeetingRead


class PaginationParams(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page: int = Field(1, ge=1)
    page_size: Literal[20] = 20


class PaginatedMeetings(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, from_attributes=True)

    items: list[MeetingRead]
    page: int
    page_size: int
    total: int

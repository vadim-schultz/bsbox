"""MS Teams integration model schemas for API responses."""

from pydantic import BaseModel, ConfigDict


class MSTeamsMeetingRead(BaseModel):
    """Read schema for MS Teams meeting integration data."""

    model_config = ConfigDict(from_attributes=True)

    thread_id: str | None = None
    meeting_id: str | None = None
    invite_url: str | None = None

"""Meeting request schemas for updates and mutations."""

from pydantic import BaseModel, Field, field_validator


class MeetingDurationUpdate(BaseModel):
    """Request to update a meeting's duration."""

    duration_minutes: int = Field(..., description="Allowed values: 30 or 60")

    @field_validator("duration_minutes")
    @classmethod
    def _validate_duration(cls, value: int) -> int:
        if value not in {30, 60}:
            raise ValueError("duration_minutes must be 30 or 60")
        return value

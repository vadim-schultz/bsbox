"""Participant request schemas for creation and status updates."""

from pydantic import BaseModel, Field

from app.schema.participant.types import StatusLiteral


class ParticipantCreate(BaseModel):
    """Schema for creating a new participant in a meeting."""

    meeting_id: str
    device_fingerprint: str = ""


class StatusChangeRequest(BaseModel):
    """Request to change a participant's engagement status."""

    meeting_id: str = Field(..., description="Target meeting id")
    participant_id: str | None = Field(None, description="Existing participant id, if any")
    status: StatusLiteral = Field(..., description="Participant status")

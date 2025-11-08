from datetime import datetime

from pydantic import BaseModel, Field


class MeetingEventRequest(BaseModel):
    visitor_id: str = Field(..., description="Unique identifier of the hotspot client")
    is_speaking: bool = Field(False, description="Whether the participant is speaking")
    is_relevant: bool = Field(False, description="Whether the meeting is relevant for the participant")
    timestamp: datetime | None = Field(None, description="Client-reported timestamp")


class ParticipantSnapshot(BaseModel):
    visitor_id: str
    display_name: str | None = None
    signal_strength: int | None = None
    is_speaking: bool = False
    is_relevant: bool = False


class MeetingAnalyticsResponse(BaseModel):
    meeting_id: str
    participant_count: int
    speakers: int
    relevance_score: float
    speaking_score: float
    timestamp: datetime
    participants: list[ParticipantSnapshot] = Field(default_factory=list)


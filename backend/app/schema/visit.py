from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VisitRequest(BaseModel):
    device_fingerprint: str = Field(..., description="Device/browser fingerprint for identifying returning visitor")
    city_id: str | None = None
    meeting_room_id: str | None = None
    ms_teams_input: str | None = None


class VisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    meeting_id: str
    participant_id: str
    participant_expires_at: datetime
    meeting_start: datetime
    meeting_end: datetime


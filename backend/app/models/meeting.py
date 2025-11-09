import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MeetingParticipantLink(SQLModel, table=True):
    __tablename__ = "meeting_participants"

    meeting_id: str = Field(foreign_key="meetings.id", primary_key=True)
    participant_id: str = Field(foreign_key="participants.id", primary_key=True)


class Participant(BaseModel, table=True):
    __tablename__ = "participants"

    id: str = Field(default_factory=_uuid, primary_key=True)
    device_id: str = Field(index=True, unique=True)
    last_seen: datetime = Field(default_factory=_utcnow)
    signal_strength: Optional[int] = Field(default=None)

    meetings: List["Meeting"] = Relationship(
        back_populates="participants",
        link_model=MeetingParticipantLink,
    )
    engagement_events: List["EngagementEvent"] = Relationship(
        back_populates="participant"
    )
    connection_events: List["ConnectionEvent"] = Relationship(
        back_populates="participant"
    )


class Meeting(BaseModel, table=True):
    __tablename__ = "meetings"

    id: str = Field(default_factory=_uuid, primary_key=True)
    scheduled_start: datetime = Field(index=True)
    actual_start: datetime = Field(default_factory=_utcnow)
    actual_end: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    participants: List[Participant] = Relationship(
        back_populates="meetings",
        link_model=MeetingParticipantLink,
    )
    connection_events: List["ConnectionEvent"] = Relationship(back_populates="meeting")
    engagement_events: List["EngagementEvent"] = Relationship(back_populates="meeting")


class ConnectionEvent(BaseModel, table=True):
    __tablename__ = "connection_events"

    id: str = Field(default_factory=_uuid, primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    participant_id: str = Field(foreign_key="participants.id", index=True)
    timestamp: datetime = Field(default_factory=_utcnow, index=True)
    is_connected: bool = Field(default=True)
    signal_strength: Optional[int] = Field(default=None)

    meeting: "Meeting" = Relationship(back_populates="connection_events")
    participant: Participant = Relationship(back_populates="connection_events")


class EngagementEvent(BaseModel, table=True):
    __tablename__ = "engagement_events"

    id: str = Field(default_factory=_uuid, primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    participant_id: str = Field(foreign_key="participants.id", index=True)
    timestamp: datetime = Field(default_factory=_utcnow, index=True)
    is_speaking: bool = Field(default=False)
    is_relevant: bool = Field(default=False)

    meeting: Meeting = Relationship(back_populates="engagement_events")
    participant: Participant = Relationship(back_populates="engagement_events")

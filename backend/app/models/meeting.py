from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


class MeetingParticipantLink(SQLModel, table=True):
    __tablename__ = "meeting_participants"

    meeting_id: str = Field(foreign_key="meetings.id", primary_key=True)
    participant_id: str = Field(foreign_key="participants.id", primary_key=True)


class Participant(BaseModel, table=True):
    __tablename__ = "participants"

    id: str = Field(default_factory=_uuid, primary_key=True)
    device_id: str = Field(index=True, unique=True)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    signal_strength: Optional[int] = Field(default=None)

    meetings: list["Meeting"] = Relationship(
        back_populates="participants",
        link_model=MeetingParticipantLink,
    )
    engagement_events: list["EngagementEvent"] = Relationship(back_populates="participant")
    connection_events: list["ConnectionEvent"] = Relationship(back_populates="participant")


class Meeting(BaseModel, table=True):
    __tablename__ = "meetings"

    id: str = Field(default_factory=_uuid, primary_key=True)
    scheduled_start: datetime = Field(index=True)
    actual_start: datetime = Field(default_factory=datetime.utcnow)
    actual_end: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    participants: list[Participant] = Relationship(
        back_populates="meetings",
        link_model=MeetingParticipantLink,
    )
    connection_events: list["ConnectionEvent"] = Relationship(back_populates="meeting")
    engagement_events: list["EngagementEvent"] = Relationship(back_populates="meeting")


class ConnectionEvent(BaseModel, table=True):
    __tablename__ = "connection_events"

    id: str = Field(default_factory=_uuid, primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    participant_id: str = Field(foreign_key="participants.id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    is_connected: bool = Field(default=True)
    signal_strength: Optional[int] = Field(default=None)

    meeting: Meeting = Relationship(back_populates="connection_events")
    participant: Participant = Relationship(back_populates="connection_events")


class EngagementEvent(BaseModel, table=True):
    __tablename__ = "engagement_events"

    id: str = Field(default_factory=_uuid, primary_key=True)
    meeting_id: str = Field(foreign_key="meetings.id", index=True)
    participant_id: str = Field(foreign_key="participants.id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    is_speaking: bool = Field(default=False)
    is_relevant: bool = Field(default=False)

    meeting: Meeting = Relationship(back_populates="engagement_events")
    participant: Participant = Relationship(back_populates="engagement_events")


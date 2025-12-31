from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.utils.datetime import ensure_utc


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    city_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("cities.id"), nullable=True, index=True
    )
    meeting_room_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("meeting_rooms.id"), nullable=True, index=True
    )
    ms_teams_meeting_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ms_teams_meetings.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    participants: Mapped[list[Participant]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    city: Mapped[City] = relationship(back_populates="meetings")
    meeting_room: Mapped[MeetingRoom] = relationship(back_populates="meetings")
    ms_teams_meeting: Mapped[MSTeamsMeeting | None] = relationship()

    def to_read_schema(self) -> MeetingRead:
        """Convert ORM model to MeetingRead schema."""
        from app.schema import MeetingRead
        from app.schema.ms_teams_meeting import MSTeamsMeetingRead

        ms_teams = None
        if self.ms_teams_meeting:
            ms_teams = MSTeamsMeetingRead(
                thread_id=self.ms_teams_meeting.thread_id,
                meeting_id=self.ms_teams_meeting.meeting_id,
                invite_url=self.ms_teams_meeting.invite_url,
            )

        return MeetingRead(
            id=self.id,
            start_ts=ensure_utc(self.start_ts),
            end_ts=ensure_utc(self.end_ts),
            city_id=self.city_id,
            city_name=self.city.name if self.city else None,
            meeting_room_id=self.meeting_room_id,
            meeting_room_name=self.meeting_room.name if self.meeting_room else None,
            ms_teams=ms_teams,
        )

    def to_full_schema(self) -> MeetingWithParticipants:
        """Convert ORM model to MeetingWithParticipants schema with participant data."""
        from app.schema import MeetingWithParticipants

        participants = [p.to_read_schema() for p in self.participants]
        meeting_data = self.to_read_schema().model_dump()
        return MeetingWithParticipants(participants=participants, **meeting_data)


if TYPE_CHECKING:
    from app.models.city import City
    from app.models.meeting_room import MeetingRoom
    from app.models.ms_teams_meeting import MSTeamsMeeting
    from app.models.participant import Participant
    from app.schema import MeetingRead, MeetingWithParticipants

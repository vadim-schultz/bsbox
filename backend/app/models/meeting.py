from datetime import datetime
from typing import List
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    city_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("cities.id"), nullable=True, index=True
    )
    meeting_room_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("meeting_rooms.id"), nullable=True, index=True
    )
    ms_teams_thread_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    ms_teams_meeting_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ms_teams_invite_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    participants: Mapped[List["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    city: Mapped["City"] = relationship(back_populates="meetings")
    meeting_room: Mapped["MeetingRoom"] = relationship(back_populates="meetings")

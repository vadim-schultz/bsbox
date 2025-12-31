from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    meeting_rooms: Mapped[list[MeetingRoom]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    meetings: Mapped[list[Meeting]] = relationship(back_populates="city")


if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.meeting_room import MeetingRoom


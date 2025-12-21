from datetime import datetime
from typing import List
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"
    __table_args__ = (UniqueConstraint("name", "city_id", name="uq_meeting_room_city"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    city_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cities.id"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    city: Mapped["City"] = relationship(back_populates="meeting_rooms")
    meetings: Mapped[List["Meeting"]] = relationship(back_populates="meeting_room")

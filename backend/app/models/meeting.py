from datetime import datetime
from typing import List
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    participants: Mapped[List["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )

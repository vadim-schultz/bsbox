"""MS Teams meeting integration model."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MSTeamsMeeting(Base):
    """Represents MS Teams meeting integration data."""

    __tablename__ = "ms_teams_meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    thread_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    meeting_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    invite_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

"""Meeting summary model for storing computed engagement statistics."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class MeetingSummary(Base):
    """Summary statistics for a completed meeting."""

    __tablename__ = "meeting_summaries"

    meeting_id: Mapped[str] = mapped_column(String(36), ForeignKey("meetings.id"), primary_key=True)
    max_participants: Mapped[int] = mapped_column(nullable=False)
    normalized_engagement: Mapped[float] = mapped_column(nullable=False)
    engagement_level: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "high", "healthy", "passive", "low"
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    meeting: Mapped["Meeting"] = relationship(back_populates="summary")

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EngagementSample(Base):
    __tablename__ = "engagement_samples"
    __table_args__ = (
        UniqueConstraint("participant_id", "bucket", name="uq_sample_bucket"),
        Index("ix_engagement_samples_meeting_id", "meeting_id"),
        Index("ix_engagement_samples_bucket", "bucket"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[str] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    participant_id: Mapped[str] = mapped_column(
        ForeignKey("participants.id"), nullable=False, index=True
    )
    bucket: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    device_fingerprint: Mapped[str] = mapped_column(String(128), nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    participant: Mapped[Participant] = relationship(back_populates="engagement_samples")


if TYPE_CHECKING:
    from app.models.participant import Participant

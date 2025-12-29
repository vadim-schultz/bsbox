from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(ForeignKey("meetings.id"), nullable=False, index=True)
    device_fingerprint: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True, server_default=""
    )
    last_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    engagement_samples: Mapped[list[EngagementSample]] = relationship(
        back_populates="participant", cascade="all, delete-orphan"
    )

    def to_read_schema(self) -> ParticipantRead:
        """Convert ORM model to ParticipantRead schema with engagement samples."""
        from app.schema import EngagementSampleRead, ParticipantRead

        samples = []
        for s in sorted(self.engagement_samples, key=lambda s: s.bucket):
            bucket_dt = s.bucket.replace(tzinfo=UTC) if s.bucket.tzinfo is None else s.bucket
            samples.append(EngagementSampleRead(bucket=bucket_dt, status=s.status))

        return ParticipantRead(
            id=self.id,
            meeting_id=self.meeting_id,
            device_fingerprint=self.device_fingerprint,
            last_status=self.last_status,
            engagement_samples=samples,
        )


if TYPE_CHECKING:
    from app.models.engagement_sample import EngagementSample
    from app.models.meeting import Meeting
    from app.schema import ParticipantRead

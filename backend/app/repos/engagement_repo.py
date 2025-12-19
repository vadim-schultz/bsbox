from datetime import datetime
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EngagementSample


class EngagementRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert_sample(
        self, meeting_id: str, participant_id: str, bucket: datetime, status: str, device_fingerprint: str
    ) -> EngagementSample:
        stmt = select(EngagementSample).where(
            EngagementSample.participant_id == participant_id,
            EngagementSample.bucket == bucket,
        )
        existing = self.session.scalars(stmt).first()
        if existing:
            existing.status = status
            existing.device_fingerprint = device_fingerprint
            self.session.add(existing)
            self.session.flush()
            self.session.refresh(existing)
            return existing

        sample = EngagementSample(
            participant_id=participant_id,
            meeting_id=meeting_id,
            bucket=bucket,
            status=status,
            device_fingerprint=device_fingerprint,
        )
        self.session.add(sample)
        self.session.flush()
        self.session.refresh(sample)
        return sample

    def get_samples_for_meeting(
        self, meeting_id: str, start: datetime | None = None, end: datetime | None = None
    ) -> Iterable[EngagementSample]:
        stmt = select(EngagementSample).where(EngagementSample.meeting_id == meeting_id)
        if start:
            stmt = stmt.where(EngagementSample.bucket >= start)
        if end:
            stmt = stmt.where(EngagementSample.bucket <= end)
        stmt = stmt.order_by(EngagementSample.bucket.asc())
        return self.session.scalars(stmt).all()

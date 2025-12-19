from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Participant


class ParticipantRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_with_engagement(self, participant_id: str) -> Participant | None:
        stmt = (
            select(Participant)
            .options(selectinload(Participant.engagement_samples))
            .where(Participant.id == participant_id)
        )
        return self.session.scalars(stmt).first()

    def get_by_fingerprint(self, device_fingerprint: str, meeting_id: str) -> Participant | None:
        stmt = select(Participant).where(
            Participant.device_fingerprint == device_fingerprint, Participant.meeting_id == meeting_id
        )
        return self.session.scalars(stmt).first()

    def create(self, meeting_id: str, expires_at: datetime, device_fingerprint: str) -> Participant:
        participant = Participant(
            id=str(uuid4()),
            meeting_id=meeting_id,
            expires_at=expires_at,
            device_fingerprint=device_fingerprint,
        )
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        participant.last_status = status
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

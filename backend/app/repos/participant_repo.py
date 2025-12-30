"""Participant repository for database operations."""

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Participant


class ParticipantRepo:
    """Repository for participant CRUD operations."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_with_engagement(self, participant_id: str) -> Participant | None:
        """Get participant by ID with engagement samples loaded."""
        stmt = (
            select(Participant)
            .options(selectinload(Participant.engagement_samples))
            .where(Participant.id == participant_id)
        )
        return self.session.scalars(stmt).first()

    def create(self, meeting_id: str) -> Participant:
        """Create a new participant for a meeting.

        No fingerprint needed - each connection creates a fresh participant.
        """
        participant = Participant(
            id=str(uuid4()),
            meeting_id=meeting_id,
        )
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        """Update participant's last status."""
        participant.last_status = status
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

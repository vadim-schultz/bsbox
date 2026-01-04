"""Participant repository for database operations."""

from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Participant
from app.schema.websocket.requests import JoinRequest


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

    def create(self, meeting_id: str, request: JoinRequest) -> Participant:
        """Create a new participant for a meeting.

        No fingerprint needed - each connection creates a fresh participant.
        """
        participant = Participant(
            id=str(uuid4()),
            meeting_id=meeting_id,
            device_fingerprint=request.fingerprint,
        )
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

    def find_by_fingerprint(self, meeting_id: str, device_fingerprint: str) -> Participant | None:
        """Find participant by meeting and device fingerprint."""
        stmt = select(Participant).where(
            Participant.meeting_id == meeting_id,
            Participant.device_fingerprint == device_fingerprint,
        )
        return self.session.scalars(stmt).first()

    def get_for_meeting(self, meeting_id: str) -> list[Participant]:
        """Get all participants for a meeting (fresh query)."""
        stmt = select(Participant).where(Participant.meeting_id == meeting_id)
        return list(self.session.scalars(stmt).all())

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        """Update participant's last status."""
        participant.last_status = status
        self.session.add(participant)
        self.session.flush()
        self.session.refresh(participant)
        return participant

    def get_max_participant_count(self, meeting_id: str) -> int:
        """Get the maximum number of participants who joined the meeting.

        Args:
            meeting_id: The meeting ID

        Returns:
            Count of unique participants for the meeting
        """
        stmt = select(func.count(Participant.id)).where(Participant.meeting_id == meeting_id)
        count = self.session.scalar(stmt)
        return int(count) if count else 0

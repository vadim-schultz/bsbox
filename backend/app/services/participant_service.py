"""Participant service for managing meeting participants."""

from datetime import UTC, datetime

from app.models import Meeting, Participant
from app.repos import ParticipantRepo
from app.schema.websocket.requests import JoinRequest


class ParticipantService:
    """Service for participant lifecycle management."""

    def __init__(self, participant_repo: ParticipantRepo) -> None:
        self.participant_repo = participant_repo

    def create_or_reuse_for_connection(self, meeting: Meeting, request: JoinRequest) -> Participant:
        """Create or reuse a participant for a WebSocket connection based on fingerprint."""
        now = datetime.now(tz=UTC)

        if request.fingerprint:
            existing = self.participant_repo.find_by_fingerprint(meeting.id, request.fingerprint)
            if existing:
                existing.last_seen_at = now
                return existing

        participant = self.participant_repo.create(meeting_id=meeting.id, request=request)
        participant.last_seen_at = now
        return participant

    def get_by_id(self, participant_id: str) -> Participant | None:
        """Get participant by ID with engagement samples loaded."""
        return self.participant_repo.get_with_engagement(participant_id)

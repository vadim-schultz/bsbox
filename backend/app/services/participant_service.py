"""Participant service for managing meeting participants."""

from datetime import UTC, datetime

from app.models import Meeting, Participant
from app.repos import ParticipantRepo


class ParticipantService:
    """Service for participant lifecycle management."""

    def __init__(self, participant_repo: ParticipantRepo) -> None:
        self.participant_repo = participant_repo

    def _is_meeting_ended(self, meeting: Meeting, now: datetime) -> bool:
        """Check if the meeting has ended based on its end timestamp."""
        end_ts = (
            meeting.end_ts.replace(tzinfo=UTC) if meeting.end_ts.tzinfo is None else meeting.end_ts
        )
        current = now if now.tzinfo is not None else now.replace(tzinfo=UTC)
        return end_ts <= current

    def create_for_connection(self, meeting: Meeting) -> Participant:
        """Create a new participant for a WebSocket connection.

        Each connection creates a new participant - no fingerprint matching.
        This provides accurate presence tracking (each tab = separate participant).
        """
        return self.participant_repo.create(meeting_id=meeting.id)

    def get_by_id(self, participant_id: str) -> Participant | None:
        """Get participant by ID with engagement samples loaded."""
        return self.participant_repo.get_with_engagement(participant_id)

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        """Update participant's last known status."""
        return self.participant_repo.update_last_status(participant, status)

"""Participant service for managing meeting participants."""

from datetime import UTC, datetime

from app.models import Meeting, Participant
from app.repos import ParticipantRepo
from app.utils.datetime import ensure_utc


class ParticipantService:
    """Service for participant lifecycle management."""

    def __init__(self, participant_repo: ParticipantRepo) -> None:
        self.participant_repo = participant_repo

    def _is_meeting_ended(self, meeting: Meeting, now: datetime) -> bool:
        """Check if the meeting has ended based on its end timestamp."""
        end_ts = ensure_utc(meeting.end_ts)
        current = ensure_utc(now)
        return end_ts <= current

    def create_or_reuse_for_connection(
        self, meeting: Meeting, device_fingerprint: str
    ) -> Participant:
        """Create or reuse a participant for a WebSocket connection based on fingerprint."""
        now = datetime.now(tz=UTC)

        if device_fingerprint:
            existing = self.participant_repo.find_by_fingerprint(meeting.id, device_fingerprint)
            if existing:
                existing.last_seen_at = now
                return existing

        participant = self.participant_repo.create(
            meeting_id=meeting.id, device_fingerprint=device_fingerprint
        )
        participant.last_seen_at = now
        return participant

    def get_by_id(self, participant_id: str) -> Participant | None:
        """Get participant by ID with engagement samples loaded."""
        return self.participant_repo.get_with_engagement(participant_id)

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        """Update participant's last known status."""
        return self.participant_repo.update_last_status(participant, status)

from datetime import UTC, datetime

from app.models import Meeting, Participant
from app.repos import ParticipantRepo


class ParticipantService:
    def __init__(self, participant_repo: ParticipantRepo) -> None:
        self.participant_repo = participant_repo

    def _is_meeting_ended(self, meeting: Meeting, now: datetime) -> bool:
        """Check if the meeting has ended based on its end timestamp."""
        end_ts = (
            meeting.end_ts.replace(tzinfo=UTC)
            if meeting.end_ts.tzinfo is None
            else meeting.end_ts
        )
        current = now if now.tzinfo is not None else now.replace(tzinfo=UTC)
        return end_ts <= current

    def create_anonymous(self, meeting: Meeting, device_fingerprint: str) -> Participant:
        """Create a new anonymous participant for a meeting."""
        return self.participant_repo.create(
            meeting_id=meeting.id, device_fingerprint=device_fingerprint
        )

    def get_or_create_active(
        self,
        meeting: Meeting,
        now: datetime,
        device_fingerprint: str,
        participant_id: str | None = None,
    ) -> Participant:
        # If meeting has ended, don't return existing participants
        if self._is_meeting_ended(meeting, now):
            return self.create_anonymous(meeting=meeting, device_fingerprint=device_fingerprint)

        if participant_id:
            existing = self.participant_repo.get_with_engagement(participant_id)
            if existing:
                return existing

        if device_fingerprint:
            existing = self.participant_repo.get_by_fingerprint(device_fingerprint, meeting.id)
            if existing:
                return existing

        return self.create_anonymous(meeting=meeting, device_fingerprint=device_fingerprint)

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        return self.participant_repo.update_last_status(participant, status)

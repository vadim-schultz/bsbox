from datetime import datetime

from app.models import Meeting, Participant
from app.repos import ParticipantRepo


class ParticipantService:
    def __init__(self, participant_repo: ParticipantRepo) -> None:
        self.participant_repo = participant_repo

    def _is_expired(self, participant: Participant, now: datetime) -> bool:
        return participant.expires_at <= now

    def create_anonymous(self, meeting: Meeting, device_fingerprint: str) -> Participant:
        # Expire at meeting end to align anonymous lifetime with meeting duration
        expires_at = meeting.end_ts
        return self.participant_repo.create(
            meeting_id=meeting.id, expires_at=expires_at, device_fingerprint=device_fingerprint
        )

    def get_or_create_active(
        self, meeting: Meeting, now: datetime, device_fingerprint: str, participant_id: str | None = None
    ) -> Participant:
        if participant_id:
            existing = self.participant_repo.get_with_engagement(participant_id)
            if existing and not self._is_expired(existing, now):
                return existing

        if device_fingerprint:
            existing = self.participant_repo.get_by_fingerprint(device_fingerprint, meeting.id)
            if existing and not self._is_expired(existing, now):
                return existing

        return self.create_anonymous(meeting=meeting, device_fingerprint=device_fingerprint)

    def update_last_status(self, participant: Participant, status: str) -> Participant:
        return self.participant_repo.update_last_status(participant, status)


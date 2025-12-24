from datetime import UTC, datetime, timedelta

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService


def test_engagement_bucket_rounding(session_factory):
    with session_factory() as session:
        meeting_repo = MeetingRepo(session)
        participant_repo = ParticipantRepo(session)
        engagement_repo = EngagementRepo(session)

        start = datetime(2025, 1, 1, 10, 30, tzinfo=UTC)
        meeting = meeting_repo.create(start_ts=start, end_ts=start + timedelta(hours=1))
        participant = participant_repo.create(
            meeting_id=meeting.id,
            expires_at=start + timedelta(hours=1),
            device_fingerprint="fp-123",
        )

        service = EngagementService(engagement_repo, participant_repo)
        ts = datetime(2025, 1, 1, 10, 45, 59, tzinfo=UTC)
        service.record_status(participant=participant, status="engaged", current_time=ts)

        reloaded = participant_repo.get_with_engagement(participant.id)
        assert reloaded is not None
        assert len(reloaded.engagement_samples) == 1
        bucket = reloaded.engagement_samples[0].bucket
        assert bucket.minute == 45 and bucket.second == 0 and bucket.microsecond == 0

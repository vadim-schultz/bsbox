from datetime import datetime, timedelta

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService, MeetingService, ParticipantService


def test_round_to_nearest_hour(session_factory):
    with session_factory() as session:
        repo = MeetingRepo(session)
        service = MeetingService(repo)

        early = datetime(2025, 1, 1, 14, 5)
        late = datetime(2025, 1, 1, 13, 58)

        assert service._round_to_nearest_hour(early).hour == 14
        assert service._round_to_nearest_hour(early).minute == 0
        assert service._round_to_nearest_hour(late).hour == 14
        assert service._round_to_nearest_hour(late).minute == 0


def test_engagement_bucket_rounding(session_factory):
    with session_factory() as session:
        meeting_repo = MeetingRepo(session)
        participant_repo = ParticipantRepo(session)
        engagement_repo = EngagementRepo(session)

        start = datetime(2025, 1, 1, 10, 30)
        meeting = meeting_repo.create(start_ts=start, end_ts=start + timedelta(hours=1))
        participant = participant_repo.create(
            meeting_id=meeting.id, expires_at=start + timedelta(hours=1), device_fingerprint="fp-123"
        )

        service = EngagementService(engagement_repo, participant_repo)
        ts = datetime(2025, 1, 1, 10, 45, 59)
        service.record_status(participant=participant, status="engaged", current_time=ts)

        reloaded = participant_repo.get_with_engagement(participant.id)
        assert reloaded is not None
        assert len(reloaded.engagement_samples) == 1
        bucket = reloaded.engagement_samples[0].bucket
        assert bucket.minute == 45 and bucket.second == 0 and bucket.microsecond == 0


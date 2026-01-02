from datetime import UTC, datetime, timedelta

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService, ParticipantService
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing import SmoothingAlgorithm, SmoothingFactory
from app.services.engagement.summary import SnapshotBuilder
from app.utils.datetime import ensure_utc


def test_engagement_bucket_rounding(session_factory):
    with session_factory() as session:
        meeting_repo = MeetingRepo(session)
        participant_repo = ParticipantRepo(session)
        engagement_repo = EngagementRepo(session)

        start = datetime(2025, 1, 1, 10, 30, tzinfo=UTC)
        meeting = meeting_repo.upsert_by_start(start_ts=start, end_ts=start + timedelta(hours=1))
        participant = participant_repo.create(meeting_id=meeting.id, device_fingerprint="fp-test")

        # Create components for EngagementService
        bucket_manager = BucketManager()
        smoothing_strategy = SmoothingFactory.create(SmoothingAlgorithm.KALMAN)
        snapshot_builder = SnapshotBuilder(
            engagement_repo=engagement_repo,
            participant_repo=participant_repo,
            bucket_manager=bucket_manager,
            smoothing_strategy=smoothing_strategy,
        )

        service = EngagementService(
            engagement_repo=engagement_repo,
            participant_repo=participant_repo,
            bucket_manager=bucket_manager,
            snapshot_builder=snapshot_builder,
        )
        ts = datetime(2025, 1, 1, 10, 45, 59, tzinfo=UTC)
        service.record_status(participant=participant, status="engaged", current_time=ts)

        reloaded = participant_repo.get_with_engagement(participant.id)
        assert reloaded is not None
        assert len(reloaded.engagement_samples) == 1
        bucket = reloaded.engagement_samples[0].bucket
        # SQLite may return naive datetime; ensure it's UTC-aware
        bucket_utc = ensure_utc(bucket)
        assert bucket_utc.minute == 45 and bucket_utc.second == 0 and bucket_utc.microsecond == 0
        assert bucket_utc.tzinfo == UTC
        assert ensure_utc(meeting.start_ts).tzinfo == UTC


def test_participant_reuse_by_fingerprint(session_factory):
    with session_factory() as session:
        meeting_repo = MeetingRepo(session)
        participant_repo = ParticipantRepo(session)
        participant_service = ParticipantService(participant_repo)

        start = datetime(2025, 1, 1, 12, 0, tzinfo=UTC)
        meeting = meeting_repo.upsert_by_start(start_ts=start, end_ts=start + timedelta(hours=1))

        first = participant_service.create_or_reuse_for_connection(meeting, "fp-reuse")
        session.commit()

        second = participant_service.create_or_reuse_for_connection(meeting, "fp-reuse")
        assert first.id == second.id
        assert second.device_fingerprint == "fp-reuse"


def test_participant_new_for_different_fingerprint(session_factory):
    with session_factory() as session:
        meeting_repo = MeetingRepo(session)
        participant_repo = ParticipantRepo(session)
        participant_service = ParticipantService(participant_repo)

        start = datetime(2025, 1, 1, 13, 0, tzinfo=UTC)
        meeting = meeting_repo.upsert_by_start(start_ts=start, end_ts=start + timedelta(hours=1))

        first = participant_service.create_or_reuse_for_connection(meeting, "fp-one")
        session.commit()

        second = participant_service.create_or_reuse_for_connection(meeting, "fp-two")
        assert first.id != second.id

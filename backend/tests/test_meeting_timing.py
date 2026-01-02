"""Tests for meeting timing validation (start/end checks)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.models import Meeting, Participant
from app.schema.websocket import MeetingEndedResponse, MeetingNotStartedResponse
from app.services import EngagementService
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.services.status import StatusService
from app.ws.transport.context import WSContext


def test_meeting_time_status_before_start():
    """Test meeting status check when current time is before start."""
    # Create a meeting that starts 1 hour from now
    now = datetime.now(tz=UTC)
    future_start = now + timedelta(hours=1)
    future_end = future_start + timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=future_start,
        end_ts=future_end,
    )

    has_started, has_ended = meeting.time_status()
    assert not has_started
    assert not has_ended


def test_meeting_time_status_during_meeting():
    """Test meeting status check when current time is during meeting."""
    # Create a meeting that started 30 minutes ago and ends in 30 minutes
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    has_started, has_ended = meeting.time_status()
    assert has_started
    assert not has_ended


def test_meeting_time_status_after_end():
    """Test meeting status check when current time is after end."""
    # Create a meeting that ended 1 hour ago
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(hours=2)
    past_end = now - timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=past_end,
    )

    has_started, has_ended = meeting.time_status()
    assert has_started
    assert has_ended


@pytest.mark.asyncio
async def test_status_handler_rejects_before_start():
    """Test that StatusHandler rejects status updates before meeting starts."""
    from app.schema.websocket import StatusUpdateRequest

    # Create a meeting that starts in the future
    now = datetime.now(tz=UTC)
    future_start = now + timedelta(hours=1)
    future_end = future_start + timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=future_start,
        end_ts=future_end,
    )

    participant = Participant(
        id="test-participant",
        meeting_id=meeting.id,
        device_fingerprint="test-fp",
    )

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = participant
    context.meeting = meeting

    # Create validated request
    request = StatusUpdateRequest(status="engaged")

    # Validation should fail at request level
    error = request.validate_meeting(context)
    assert isinstance(error, MeetingNotStartedResponse)
    assert "not started" in error.message.lower()


@pytest.mark.asyncio
async def test_status_handler_rejects_after_end():
    """Test that StatusHandler rejects status updates after meeting ends."""
    from app.schema.websocket import StatusUpdateRequest

    # Create a meeting that has ended
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(hours=2)
    past_end = now - timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=past_end,
    )

    participant = Participant(
        id="test-participant",
        meeting_id=meeting.id,
        device_fingerprint="test-fp",
    )
    participant.meeting = meeting

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = participant
    context.meeting = meeting

    # Create validated request
    request = StatusUpdateRequest(status="engaged")

    # Validation should fail at request level
    error = request.validate_meeting(context)
    assert isinstance(error, MeetingEndedResponse)
    assert "ended" in error.message.lower()


@pytest.mark.asyncio
async def test_status_handler_accepts_during_meeting():
    """Test that StatusService accepts status updates during active meeting."""
    from app.schema.websocket import StatusUpdateRequest

    # Create a meeting that is currently active
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    participant = Participant(
        id="test-participant",
        meeting_id=meeting.id,
        device_fingerprint="test-fp",
    )
    participant.meeting = meeting

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = participant
    context.meeting = meeting
    context.session = MagicMock()
    context.session.commit = MagicMock()

    # Mock engagement service
    engagement_service = MagicMock(spec=EngagementService)
    engagement_service.record_status.return_value = now
    engagement_service.bucket_rollup.return_value = {
        "overall": 50.0,
        "participants": {"test-participant": 50.0},
    }

    # Mock broadcast repo
    broadcast_repo = MagicMock(spec=BroadcastRepo)

    # Create validated request
    request = StatusUpdateRequest(status="engaged")

    # Validation should pass
    assert request.validate_meeting(context) is None
    assert request.validate_participant(context) is None

    service = StatusService(engagement_service, broadcast_repo)
    response = await service.execute(request, context)

    # Should not return an error response (None means success, broadcasts via repo)
    assert response is None

    # Should have called record_status
    engagement_service.record_status.assert_called_once()

    # Should have called broadcast publish_rollup
    broadcast_repo.publish_rollup.assert_called_once()


def test_engagement_service_validates_bucket_bounds():
    """Test that EngagementService validates bucket is within meeting bounds."""
    from app.repos import EngagementRepo, ParticipantRepo
    from app.services import EngagementService
    from app.services.engagement.bucketing import BucketManager
    from app.services.engagement.smoothing import SmoothingAlgorithm, SmoothingFactory
    from app.services.engagement.summary import SnapshotBuilder

    # Create mocks
    engagement_repo = MagicMock(spec=EngagementRepo)
    participant_repo = MagicMock(spec=ParticipantRepo)

    # Create real components
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

    # Create a meeting with specific bounds
    now = datetime.now(tz=UTC)
    meeting_start = now.replace(hour=10, minute=0, second=0, microsecond=0)
    meeting_end = now.replace(hour=11, minute=0, second=0, microsecond=0)

    meeting = Meeting(
        id="test-meeting",
        start_ts=meeting_start,
        end_ts=meeting_end,
    )

    participant = Participant(
        id="test-participant",
        meeting_id=meeting.id,
        device_fingerprint="test-fp",
    )
    participant.meeting = meeting

    # Test recording status before meeting start (should fail)
    time_before_start = meeting_start - timedelta(minutes=5)
    with pytest.raises(ValueError, match="before meeting start"):
        service.record_status(participant, "engaged", time_before_start)

    # Test recording status after meeting end (should fail)
    time_after_end = meeting_end + timedelta(minutes=5)
    with pytest.raises(ValueError, match="after meeting end"):
        service.record_status(participant, "engaged", time_after_end)

    # Test recording status during meeting (should succeed)
    time_during_meeting = meeting_start + timedelta(minutes=15)
    service.record_status(participant, "engaged", time_during_meeting)

    # Verify the repo was called
    engagement_repo.upsert_sample.assert_called_once()

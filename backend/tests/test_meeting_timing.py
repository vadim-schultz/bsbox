"""Tests for meeting timing validation (start/end checks)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.models import Meeting, Participant
from app.services import EngagementService
from app.ws.handlers import StatusHandler, _meeting_time_status
from app.ws.types import MeetingEndedResponse, MeetingNotStartedResponse, WSContext


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

    has_started, has_ended = _meeting_time_status(meeting)
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

    has_started, has_ended = _meeting_time_status(meeting)
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

    has_started, has_ended = _meeting_time_status(meeting)
    assert has_started
    assert has_ended


@pytest.mark.asyncio
async def test_status_handler_rejects_before_start():
    """Test that StatusHandler rejects status updates before meeting starts."""
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

    # Mock engagement service
    engagement_service = MagicMock(spec=EngagementService)

    handler = StatusHandler(engagement_service)
    message = {"status": "engaged"}

    response = await handler.handle(context, message)

    # Should return MeetingNotStartedResponse
    assert isinstance(response, MeetingNotStartedResponse)
    assert "not started" in response.message.lower()

    # Should not have called record_status
    engagement_service.record_status.assert_not_called()


@pytest.mark.asyncio
async def test_status_handler_rejects_after_end():
    """Test that StatusHandler rejects status updates after meeting ends."""
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

    # Mock engagement service
    engagement_service = MagicMock(spec=EngagementService)

    handler = StatusHandler(engagement_service)
    message = {"status": "engaged"}

    response = await handler.handle(context, message)

    # Should return MeetingEndedResponse
    assert isinstance(response, MeetingEndedResponse)
    assert "ended" in response.message.lower()

    # Should not have called record_status
    engagement_service.record_status.assert_not_called()


@pytest.mark.asyncio
async def test_status_handler_accepts_during_meeting():
    """Test that StatusHandler accepts status updates during active meeting."""
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
    context.channels = MagicMock()
    context.channels.publish = MagicMock()

    # Mock engagement service
    engagement_service = MagicMock(spec=EngagementService)
    engagement_service.record_status.return_value = now
    engagement_service.bucket_rollup.return_value = {
        "overall": 50.0,
        "participants": {"test-participant": 50.0},
    }

    handler = StatusHandler(engagement_service)
    message = {"status": "engaged"}

    response = await handler.handle(context, message)

    # Should not return an error response (None means success, broadcasts via channel)
    assert response is None

    # Should have called record_status
    engagement_service.record_status.assert_called_once()


def test_engagement_service_validates_bucket_bounds():
    """Test that EngagementService validates bucket is within meeting bounds."""
    from app.repos import EngagementRepo, ParticipantRepo
    from app.services import EngagementService

    # Create mocks
    engagement_repo = MagicMock(spec=EngagementRepo)
    participant_repo = MagicMock(spec=ParticipantRepo)

    service = EngagementService(engagement_repo, participant_repo)

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

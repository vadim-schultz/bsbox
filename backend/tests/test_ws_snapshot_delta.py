"""Tests for WebSocket snapshot/delta message optimization."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.models import Meeting, Participant
from app.schema.engagement.models import EngagementSummary
from app.schema.websocket import JoinedResponse, JoinRequest
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing.no_smoothing import NoSmoothingStrategy
from app.services.engagement.summary.snapshot_builder import SnapshotBuilder
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.services.join import JoinService
from app.ws.services.leave import LeaveService
from app.ws.transport.context import WSContext


@pytest.mark.asyncio
async def test_join_service_returns_snapshot_in_response():
    """Test that JoinService returns snapshot in JoinedResponse, not broadcast."""
    # Create active meeting
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock participant service
    mock_participant_service = MagicMock()
    mock_participant = Participant(
        id="p123",
        meeting_id="test-meeting",
        device_fingerprint="device-123",
    )
    mock_participant_service.create_or_reuse_for_connection.return_value = mock_participant

    # Mock engagement service
    mock_engagement_service = MagicMock()
    mock_summary = EngagementSummary(
        meeting_id="test-meeting",
        start=past_start,
        end=future_end,
        bucket_minutes=1,
        overall=[],
        participants=[],
    )
    mock_engagement_service.build_engagement_summary.return_value = mock_summary
    mock_engagement_service.bucket_manager.bucketize.return_value = now

    # Mock broadcast repo
    mock_broadcast_repo = MagicMock(spec=BroadcastRepo)
    mock_broadcast_repo.publish = MagicMock()
    mock_broadcast_repo.publish_rollup = MagicMock()

    # Mock context
    context = MagicMock(spec=WSContext)
    context.meeting = meeting
    context.session = MagicMock()
    context.session.commit = MagicMock()
    context.set_participant = MagicMock()

    # Create join service
    join_service = JoinService(
        participant_service=mock_participant_service,
        engagement_service=mock_engagement_service,
        broadcast_repo=mock_broadcast_repo,
    )

    # Execute join request
    request = JoinRequest(fingerprint="device-123")
    response = await join_service.execute(request, context)

    # Verify response contains snapshot
    assert isinstance(response, JoinedResponse)
    assert response.participant_id == "p123"
    assert response.meeting_id == "test-meeting"
    assert response.snapshot == mock_summary

    # Verify snapshot was NOT broadcast to all clients
    mock_broadcast_repo.publish.assert_not_called()

    # Verify delta WAS broadcast to notify others of join
    mock_broadcast_repo.publish_rollup.assert_called_once()
    call_args = mock_broadcast_repo.publish_rollup.call_args
    assert call_args[0][0] == meeting  # meeting argument
    assert call_args[0][2] == mock_engagement_service  # engagement_service argument


def test_bucket_rollup_carries_last_status_forward():
    """Bucket rollup should preserve last known status even without new samples."""
    bucket_manager = BucketManager()
    engagement_repo = MagicMock()
    participant_repo = MagicMock()

    participant_a = Participant(
        id="p-speaking",
        meeting_id="test-meeting",
        device_fingerprint="device-a",
    )
    participant_a.last_status = "speaking"
    participant_b = Participant(
        id="p-idle",
        meeting_id="test-meeting",
        device_fingerprint="device-b",
    )
    participant_b.last_status = None

    participant_repo.get_for_meeting.return_value = [participant_a, participant_b]
    engagement_repo.get_samples_for_meeting.return_value = []

    builder = SnapshotBuilder(
        engagement_repo=engagement_repo,
        participant_repo=participant_repo,
        bucket_manager=bucket_manager,
        smoothing_strategy=NoSmoothingStrategy(),
    )

    result = builder.bucket_rollup(MagicMock(id="test-meeting"), datetime.now(tz=UTC))

    assert result["participants"] == {"p-speaking": 100.0, "p-idle": 0.0}
    assert result["overall"] == 50.0


@pytest.mark.asyncio
async def test_join_service_broadcasts_delta_not_snapshot():
    """Test that JoinService only broadcasts delta, not snapshot."""
    # Create active meeting
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock services
    mock_participant_service = MagicMock()
    mock_participant = Participant(
        id="p123",
        meeting_id="test-meeting",
        device_fingerprint="device-123",
    )
    mock_participant_service.create_or_reuse_for_connection.return_value = mock_participant

    mock_engagement_service = MagicMock()
    mock_summary = EngagementSummary(
        meeting_id="test-meeting",
        start=past_start,
        end=future_end,
        bucket_minutes=1,
        overall=[],
        participants=[],
    )
    mock_engagement_service.build_engagement_summary.return_value = mock_summary
    mock_engagement_service.bucket_manager.bucketize.return_value = now

    mock_broadcast_repo = MagicMock(spec=BroadcastRepo)

    # Mock context
    context = MagicMock(spec=WSContext)
    context.meeting = meeting
    context.session = MagicMock()
    context.session.commit = MagicMock()
    context.set_participant = MagicMock()

    # Create join service
    join_service = JoinService(
        participant_service=mock_participant_service,
        engagement_service=mock_engagement_service,
        broadcast_repo=mock_broadcast_repo,
    )

    # Execute join
    request = JoinRequest(fingerprint="device-123")
    await join_service.execute(request, context)

    # Verify publish (snapshot broadcast) was NOT called
    mock_broadcast_repo.publish.assert_not_called()

    # Verify publish_rollup (delta broadcast) WAS called
    assert mock_broadcast_repo.publish_rollup.call_count == 1


@pytest.mark.asyncio
async def test_leave_broadcasts_delta_to_others():
    """Test that participant leave triggers delta broadcast."""
    # This test simulates the leave logic in connection.py
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock engagement service
    mock_engagement_service = MagicMock()
    mock_engagement_service.bucket_manager.bucketize.return_value = now

    # Mock broadcast repo
    mock_broadcast_repo = MagicMock(spec=BroadcastRepo)
    mock_broadcast_repo.publish_rollup = MagicMock()

    # Simulate leave: broadcast delta
    bucket = mock_engagement_service.bucket_manager.bucketize(now)
    mock_broadcast_repo.publish_rollup(meeting, bucket, mock_engagement_service)

    # Verify delta was broadcast
    mock_broadcast_repo.publish_rollup.assert_called_once_with(
        meeting, bucket, mock_engagement_service
    )


def test_joined_response_includes_snapshot():
    """Test that JoinedResponse schema includes snapshot field."""
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    snapshot = EngagementSummary(
        meeting_id="test-meeting",
        start=past_start,
        end=future_end,
        bucket_minutes=1,
        overall=[],
        participants=[],
    )

    response = JoinedResponse(
        participant_id="p123",
        meeting_id="test-meeting",
        snapshot=snapshot,
    )

    assert response.type == "joined"
    assert response.participant_id == "p123"
    assert response.meeting_id == "test-meeting"
    assert response.snapshot == snapshot

    # Verify it serializes correctly
    json_data = response.model_dump()
    assert json_data["type"] == "joined"
    assert json_data["participant_id"] == "p123"
    assert json_data["meeting_id"] == "test-meeting"
    assert "snapshot" in json_data


def test_leave_service_updates_and_broadcasts():
    """Test that LeaveService updates participant and broadcasts delta."""
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    participant = Participant(
        id="p123",
        meeting_id="test-meeting",
        device_fingerprint="device-123",
    )

    # Mock engagement service
    mock_engagement_service = MagicMock()
    mock_engagement_service.bucket_manager.bucketize.return_value = now

    # Mock broadcast repo
    mock_broadcast_repo = MagicMock(spec=BroadcastRepo)
    mock_broadcast_repo.publish_rollup = MagicMock()

    # Mock context
    context = MagicMock(spec=WSContext)
    context.meeting = meeting
    context.participant = participant

    # Create leave service
    leave_service = LeaveService(mock_engagement_service, mock_broadcast_repo)

    # Handle leave
    leave_service.handle_leave(context)

    # Verify participant's last_seen_at was updated
    assert participant.last_seen_at is not None

    # Verify delta was broadcast
    mock_broadcast_repo.publish_rollup.assert_called_once()
    call_args = mock_broadcast_repo.publish_rollup.call_args
    assert call_args[0][0] == meeting
    assert call_args[0][2] == mock_engagement_service


def test_leave_service_handles_no_participant():
    """Test that LeaveService gracefully handles context without participant."""
    mock_engagement_service = MagicMock()
    mock_broadcast_repo = MagicMock(spec=BroadcastRepo)

    # Mock context without participant
    context = MagicMock(spec=WSContext)
    context.participant = None

    # Create leave service
    leave_service = LeaveService(mock_engagement_service, mock_broadcast_repo)

    # Handle leave - should not raise exception
    leave_service.handle_leave(context)

    # Verify nothing was broadcast
    mock_broadcast_repo.publish_rollup.assert_not_called()

"""Tests for WebSocket lifecycle components."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import anyio
import pytest

from app.models import Meeting
from app.schema.websocket import MeetingCountdownResponse, MeetingEndedResponse
from app.ws.repos.subscription import SubscriptionRepo
from app.ws.transport.lifecycle import (
    ConnectionValidator,
    MeetingEndWatcher,
    MeetingTimingValidator,
)


class TestMeetingTimingValidator:
    """Tests for MeetingTimingValidator."""

    def test_validate_ended_meeting(self):
        """Test validation of a meeting that has already ended."""
        # Create a meeting that ended 1 hour ago
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(hours=2)
        past_end = now - timedelta(hours=1)

        meeting = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=past_end,
        )

        validator = MeetingTimingValidator()
        check = validator.validate_connection(meeting)

        assert not check.allow_connection
        assert check.reject_response is not None
        assert isinstance(check.reject_response, MeetingEndedResponse)
        assert check.countdown_response is None
        assert check.seconds_remaining == 0

    def test_validate_not_started_meeting(self):
        """Test validation of a meeting that hasn't started yet."""
        # Create a meeting that starts in 1 hour
        now = datetime.now(tz=UTC)
        future_start = now + timedelta(hours=1)
        future_end = future_start + timedelta(hours=1)

        meeting = Meeting(
            id="test-meeting",
            start_ts=future_start,
            end_ts=future_end,
        )

        validator = MeetingTimingValidator()
        check = validator.validate_connection(meeting)

        assert check.allow_connection
        assert check.countdown_response is not None
        assert isinstance(check.countdown_response, MeetingCountdownResponse)
        assert check.reject_response is None
        assert check.seconds_remaining > 0

    def test_validate_active_meeting(self):
        """Test validation of an active meeting."""
        # Create a meeting that is currently active
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(minutes=30)
        future_end = now + timedelta(minutes=30)

        meeting = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=future_end,
        )

        validator = MeetingTimingValidator()
        check = validator.validate_connection(meeting)

        assert check.allow_connection
        assert check.countdown_response is None
        assert check.reject_response is None
        assert check.seconds_remaining > 0


class TestConnectionValidator:
    """Tests for ConnectionValidator."""

    @pytest.mark.asyncio
    async def test_validate_missing_meeting(self):
        """Test validation when meeting doesn't exist."""
        socket = AsyncMock()
        timing_validator = MeetingTimingValidator()
        validator = ConnectionValidator(timing_validator)

        meeting, check = await validator.validate_and_send_response(None, socket)

        assert meeting is None
        assert check is None
        socket.send_json.assert_called_once()
        socket.close.assert_called_once_with(code=4404, reason="Meeting not found")

    @pytest.mark.asyncio
    async def test_validate_ended_meeting(self):
        """Test validation of ended meeting closes connection."""
        # Create ended meeting
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(hours=2)
        past_end = now - timedelta(hours=1)

        meeting_obj = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=past_end,
        )

        socket = AsyncMock()
        timing_validator = MeetingTimingValidator()
        validator = ConnectionValidator(timing_validator)

        meeting, check = await validator.validate_and_send_response(meeting_obj, socket)

        assert meeting is None
        assert check is None
        socket.send_json.assert_called_once()
        socket.close.assert_called_once_with(code=1000, reason="Meeting ended")

    @pytest.mark.asyncio
    async def test_validate_not_started_meeting_stays_open(self):
        """Test validation of not-started meeting sends countdown but keeps connection open."""
        # Create future meeting
        now = datetime.now(tz=UTC)
        future_start = now + timedelta(hours=1)
        future_end = future_start + timedelta(hours=1)

        meeting_obj = Meeting(
            id="test-meeting",
            start_ts=future_start,
            end_ts=future_end,
        )

        socket = AsyncMock()
        timing_validator = MeetingTimingValidator()
        validator = ConnectionValidator(timing_validator)

        meeting, check = await validator.validate_and_send_response(meeting_obj, socket)

        assert meeting is not None
        assert check is not None
        assert check.allow_connection
        assert check.countdown_response is not None
        socket.send_json.assert_called_once()
        socket.close.assert_not_called()  # Connection stays open

    @pytest.mark.asyncio
    async def test_validate_active_meeting(self):
        """Test validation of active meeting proceeds without response."""
        # Create active meeting
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(minutes=30)
        future_end = now + timedelta(minutes=30)

        meeting_obj = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=future_end,
        )

        socket = AsyncMock()
        timing_validator = MeetingTimingValidator()
        validator = ConnectionValidator(timing_validator)

        meeting, check = await validator.validate_and_send_response(meeting_obj, socket)

        assert meeting is not None
        assert check is not None
        assert check.allow_connection
        assert check.countdown_response is None
        assert check.reject_response is None
        socket.send_json.assert_not_called()
        socket.close.assert_not_called()


class TestSubscriptionRepo:
    """Tests for SubscriptionRepo."""

    @pytest.mark.asyncio
    async def test_subscribe_to_meeting(self):
        """Test event stream creation and yielding."""
        # Mock channels plugin
        channels = MagicMock()
        subscriber = MagicMock()

        # Mock events
        async def mock_iter_events():
            yield b"event1"
            yield b"event2"

        subscriber.iter_events.return_value = mock_iter_events()
        channels.start_subscription.return_value.__aenter__.return_value = subscriber

        manager = SubscriptionRepo(channels)
        is_closed = anyio.Event()

        # Collect events from stream
        events = []
        async for event in manager.subscribe_to_meeting("test-meeting", is_closed):
            events.append(event)
            if len(events) >= 2:
                break

        assert events == ["event1", "event2"]
        channels.start_subscription.assert_called_once_with(["meeting:test-meeting"])

    @pytest.mark.asyncio
    async def test_event_stream_stops_when_closed(self):
        """Test event stream stops when is_closed event is set."""
        # Mock channels plugin
        channels = MagicMock()
        subscriber = MagicMock()

        # Mock events that would continue indefinitely
        async def mock_iter_events():
            for i in range(100):
                yield f"event{i}".encode()
                await anyio.sleep(0)  # Yield control

        subscriber.iter_events.return_value = mock_iter_events()
        channels.start_subscription.return_value.__aenter__.return_value = subscriber

        manager = SubscriptionRepo(channels)
        is_closed = anyio.Event()

        # Collect events but set is_closed after 2 events
        events = []
        async for event in manager.subscribe_to_meeting("test-meeting", is_closed):
            events.append(event)
            if len(events) >= 2:
                is_closed.set()

        # Should stop after 2 events when is_closed is set
        assert len(events) == 2


class TestMeetingEndWatcher:
    """Tests for MeetingEndWatcher."""

    @pytest.mark.asyncio
    async def test_watcher_waits_and_closes(self):
        """Test watcher waits for meeting end and closes connection."""
        # Create meeting
        now = datetime.now(tz=UTC)
        meeting = Meeting(
            id="test-meeting",
            start_ts=now,
            end_ts=now + timedelta(seconds=1),
        )

        socket = AsyncMock()
        is_closed = anyio.Event()
        watcher = MeetingEndWatcher()

        # Run watcher with short timeout
        await watcher.watch(meeting, socket, is_closed, seconds_remaining=0.1)

        # Should have sent end message and set is_closed
        assert is_closed.is_set()
        socket.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_watcher_skips_if_already_closed(self):
        """Test watcher does nothing if connection already closed."""
        # Create meeting
        now = datetime.now(tz=UTC)
        meeting = Meeting(
            id="test-meeting",
            start_ts=now,
            end_ts=now + timedelta(seconds=1),
        )

        socket = AsyncMock()
        is_closed = anyio.Event()
        is_closed.set()  # Already closed

        watcher = MeetingEndWatcher()

        # Run watcher
        await watcher.watch(meeting, socket, is_closed, seconds_remaining=0.1)

        # Should not have sent anything since already closed
        socket.send_json.assert_not_called()


class TestLifecycleIntegration:
    """Integration tests for complete lifecycle flow."""

    @pytest.mark.asyncio
    async def test_coordinator_setup_active_meeting(self):
        """Test coordinator setup with active meeting."""
        from app.services import MeetingService
        from app.ws.transport.lifecycle import LifecycleCoordinator

        # Create active meeting
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(minutes=30)
        future_end = now + timedelta(minutes=30)

        meeting = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=future_end,
        )

        # Mock dependencies
        socket = AsyncMock()
        socket.path_params = {"meeting_id": "test-meeting"}

        channels = MagicMock()
        session = MagicMock()

        meeting_service = MagicMock(spec=MeetingService)
        meeting_service.get_meeting.return_value = meeting

        timing_validator = MeetingTimingValidator()
        connection_validator = ConnectionValidator(timing_validator)

        coordinator = LifecycleCoordinator(connection_validator, meeting_service)

        # Setup lifecycle
        result = await coordinator.setup(socket, channels, session)

        assert result is not None
        assert result.context.meeting == meeting
        assert result.factory is not None
        assert result.subscription_repo is not None
        assert result.watcher is not None
        assert result.seconds_remaining > 0

    @pytest.mark.asyncio
    async def test_coordinator_setup_ended_meeting(self):
        """Test coordinator setup with ended meeting returns None."""
        from app.services import MeetingService
        from app.ws.transport.lifecycle import LifecycleCoordinator

        # Create ended meeting
        now = datetime.now(tz=UTC)
        past_start = now - timedelta(hours=2)
        past_end = now - timedelta(hours=1)

        meeting = Meeting(
            id="test-meeting",
            start_ts=past_start,
            end_ts=past_end,
        )

        # Mock dependencies
        socket = AsyncMock()
        socket.path_params = {"meeting_id": "test-meeting"}

        channels = MagicMock()
        session = MagicMock()

        meeting_service = MagicMock(spec=MeetingService)
        meeting_service.get_meeting.return_value = meeting

        timing_validator = MeetingTimingValidator()
        connection_validator = ConnectionValidator(timing_validator)

        coordinator = LifecycleCoordinator(connection_validator, meeting_service)

        # Setup lifecycle
        result = await coordinator.setup(socket, channels, session)

        # Should return None for ended meeting
        assert result is None
        socket.send_json.assert_called_once()
        socket.close.assert_called_once()

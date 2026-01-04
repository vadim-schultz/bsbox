"""Tests for WebSocket message processor with discriminated unions."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.models import Meeting
from app.schema.engagement.models import EngagementSummary
from app.schema.websocket import (
    ErrorResponse,
    JoinedResponse,
    MeetingNotStartedResponse,
    PongResponse,
)
from app.ws.controllers.routing import MessageRouter
from app.ws.shared.factory import WSServiceFactory
from app.ws.transport.context import WSContext

# Create router instance for tests
router = MessageRouter()


@pytest.mark.asyncio
async def test_processor_routes_join_request():
    """Test that processor correctly routes join request via discriminated union."""
    # Create active meeting
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = None  # Not joined yet
    context.meeting = meeting
    context.session = MagicMock()
    context.session.commit = MagicMock()

    # Mock factory and service with async execute
    factory = MagicMock(spec=WSServiceFactory)
    mock_service = MagicMock()

    # Make execute return a coroutine
    async def mock_execute(req, ctx):
        snapshot = EngagementSummary(
            meeting_id="test-meeting",
            start=past_start,
            end=future_end,
            bucket_minutes=1,
            overall=[],
            participants=[],
        )
        return JoinedResponse(participant_id="p123", meeting_id="test-meeting", snapshot=snapshot)

    mock_service.execute = mock_execute
    factory.get_service.return_value = mock_service

    # Process join message
    message = {"type": "join", "fingerprint": "device-123"}
    response = await router.route_message(message, context, factory)

    # Should route to join service
    factory.get_service.assert_called_once_with("join")
    assert isinstance(response, JoinedResponse)


@pytest.mark.asyncio
async def test_processor_validates_meeting_before_execution():
    """Test that processor runs meeting validation before executing."""
    # Create meeting that hasn't started
    now = datetime.now(tz=UTC)
    future_start = now + timedelta(hours=1)
    future_end = future_start + timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=future_start,
        end_ts=future_end,
    )

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = None
    context.meeting = meeting

    # Mock factory
    factory = MagicMock(spec=WSServiceFactory)

    # Process status message (requires active meeting)
    message = {"type": "status", "status": "engaged"}
    response = await router.route_message(message, context, factory)

    # Should return meeting not started error without calling service
    assert isinstance(response, MeetingNotStartedResponse)
    assert response.type == "meeting_not_started"
    factory.get_service.assert_not_called()


@pytest.mark.asyncio
async def test_processor_validates_participant_before_execution():
    """Test that processor runs participant validation before executing."""
    # Create active meeting
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock context without participant
    context = MagicMock(spec=WSContext)
    context.participant = None  # Not joined
    context.meeting = meeting

    # Mock factory
    factory = MagicMock(spec=WSServiceFactory)

    # Process status message (requires joined participant)
    message = {"type": "status", "status": "engaged"}
    response = await router.route_message(message, context, factory)

    # Should return not joined error without calling service
    assert isinstance(response, ErrorResponse)
    assert response.message == "Not joined"
    factory.get_service.assert_not_called()


@pytest.mark.asyncio
async def test_processor_handles_invalid_message_type():
    """Test that processor handles invalid message type gracefully."""
    # Mock context
    context = MagicMock(spec=WSContext)
    factory = MagicMock(spec=WSServiceFactory)

    # Invalid message type
    message = {"type": "invalid_type"}
    response = await router.route_message(message, context, factory)

    # Should return validation error
    assert isinstance(response, ErrorResponse)
    assert "Invalid request" in response.message


@pytest.mark.asyncio
async def test_processor_handles_missing_required_fields():
    """Test that processor validates required fields."""
    # Mock context
    context = MagicMock(spec=WSContext)
    factory = MagicMock(spec=WSServiceFactory)

    # Join message without required fingerprint
    message = {"type": "join"}
    response = await router.route_message(message, context, factory)

    # Should return validation error
    assert isinstance(response, ErrorResponse)
    assert "Invalid request" in response.message


@pytest.mark.asyncio
async def test_processor_handles_invalid_field_values():
    """Test that processor validates field values."""
    # Mock context
    context = MagicMock(spec=WSContext)
    factory = MagicMock(spec=WSServiceFactory)

    # Status message with invalid status value
    message = {"type": "status", "status": "invalid_status"}
    response = await router.route_message(message, context, factory)

    # Should return validation error
    assert isinstance(response, ErrorResponse)
    assert "Invalid request" in response.message


@pytest.mark.asyncio
async def test_processor_ping_bypasses_meeting_validation():
    """Test that ping requests don't require active meeting."""
    # Create meeting that hasn't started
    now = datetime.now(tz=UTC)
    future_start = now + timedelta(hours=1)
    future_end = future_start + timedelta(hours=1)

    meeting = Meeting(
        id="test-meeting",
        start_ts=future_start,
        end_ts=future_end,
    )

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = None
    context.meeting = meeting

    # Mock factory and service with async execute
    factory = MagicMock(spec=WSServiceFactory)
    mock_service = MagicMock()

    # Make execute return a coroutine
    async def mock_execute(req, ctx):
        return PongResponse(server_time="2024-01-01T12:00:00Z")

    mock_service.execute = mock_execute
    factory.get_service.return_value = mock_service

    # Process ping message
    message = {"type": "ping"}
    response = await router.route_message(message, context, factory)

    # Should succeed even though meeting hasn't started
    assert isinstance(response, PongResponse)
    assert response.type == "pong"
    factory.get_service.assert_called_once_with("ping")


@pytest.mark.asyncio
async def test_processor_handles_handler_exceptions():
    """Test that processor catches and converts service exceptions."""
    # Create active meeting
    now = datetime.now(tz=UTC)
    past_start = now - timedelta(minutes=30)
    future_end = now + timedelta(minutes=30)

    meeting = Meeting(
        id="test-meeting",
        start_ts=past_start,
        end_ts=future_end,
    )

    # Mock context
    context = MagicMock(spec=WSContext)
    context.participant = None
    context.meeting = meeting

    # Mock factory with failing service
    factory = MagicMock(spec=WSServiceFactory)
    mock_service = MagicMock()
    mock_service.execute.side_effect = Exception("Service error")
    factory.get_service.return_value = mock_service

    # Process join message
    message = {"type": "join", "fingerprint": "device-123"}
    response = await router.route_message(message, context, factory)

    # Should return internal error
    assert isinstance(response, ErrorResponse)
    assert response.message == "Internal error"

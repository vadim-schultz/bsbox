"""Tests for WebSocket request/response Pydantic models validation."""

import pytest
from pydantic import ValidationError

from app.schema.websocket import (
    ErrorResponse,
    JoinedResponse,
    JoinRequest,
    MeetingCountdownResponse,
    MeetingEndedResponse,
    MeetingNotStartedResponse,
    PingRequest,
    PongResponse,
    SnapshotMessage,
    StatusUpdateRequest,
)


class TestJoinRequest:
    """Tests for JoinRequest validation."""

    def test_valid_join_request(self):
        """Test valid join request with non-empty fingerprint."""
        request = JoinRequest(fingerprint="test-device-123")
        assert request.fingerprint == "test-device-123"

    def test_empty_fingerprint_raises_error(self):
        """Test that empty fingerprint raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            JoinRequest(fingerprint="")
        assert "fingerprint cannot be empty" in str(exc_info.value)

    def test_whitespace_fingerprint_raises_error(self):
        """Test that whitespace-only fingerprint raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            JoinRequest(fingerprint="   ")
        assert "fingerprint cannot be empty" in str(exc_info.value)

    def test_fingerprint_trimmed(self):
        """Test that fingerprint whitespace is trimmed."""
        request = JoinRequest(fingerprint="  test-device  ")
        assert request.fingerprint == "test-device"

    def test_missing_fingerprint_raises_error(self):
        """Test that missing fingerprint field raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            JoinRequest.model_validate({})
        assert "fingerprint" in str(exc_info.value)


class TestStatusUpdateRequest:
    """Tests for StatusUpdateRequest validation."""

    def test_valid_status_speaking(self):
        """Test valid status update with 'speaking'."""
        request = StatusUpdateRequest(status="speaking")
        assert request.status == "speaking"

    def test_valid_status_engaged(self):
        """Test valid status update with 'engaged'."""
        request = StatusUpdateRequest(status="engaged")
        assert request.status == "engaged"

    def test_valid_status_disengaged(self):
        """Test valid status update with 'disengaged'."""
        request = StatusUpdateRequest(status="disengaged")
        assert request.status == "disengaged"

    def test_invalid_status_raises_error(self):
        """Test that invalid status value raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            StatusUpdateRequest(status="invalid-status")  # type: ignore[arg-type]
        assert "status" in str(exc_info.value).lower()

    def test_missing_status_raises_error(self):
        """Test that missing status field raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            StatusUpdateRequest.model_validate({})
        assert "status" in str(exc_info.value)


class TestPingRequest:
    """Tests for PingRequest validation."""

    def test_valid_ping_request_with_time(self):
        """Test valid ping request with client_time."""
        request = PingRequest(client_time="2024-01-01T12:00:00Z")
        assert request.client_time == "2024-01-01T12:00:00Z"

    def test_valid_ping_request_without_time(self):
        """Test valid ping request without client_time."""
        request = PingRequest()
        assert request.client_time is None

    def test_empty_message_creates_valid_ping(self):
        """Test that empty dict creates valid PingRequest."""
        request = PingRequest.model_validate({})
        assert request.client_time is None


class TestResponseModels:
    """Tests for response model serialization."""

    def test_joined_response_structure(self):
        """Test JoinedResponse has correct structure."""
        response = JoinedResponse(participant_id="p123", meeting_id="m456")
        data = response.model_dump()
        assert data["type"] == "joined"
        assert data["participant_id"] == "p123"
        assert data["meeting_id"] == "m456"

    def test_pong_response_structure(self):
        """Test PongResponse has correct structure."""
        response = PongResponse(server_time="2024-01-01T12:00:00Z")
        data = response.model_dump()
        assert data["type"] == "pong"
        assert data["server_time"] == "2024-01-01T12:00:00Z"

    def test_error_response_structure(self):
        """Test ErrorResponse has correct structure."""
        response = ErrorResponse(message="Something went wrong")
        data = response.model_dump()
        assert data["type"] == "error"
        assert data["message"] == "Something went wrong"

    def test_meeting_ended_response_structure(self):
        """Test MeetingEndedResponse has correct structure."""
        response = MeetingEndedResponse(
            message="Meeting has ended", end_time="2024-01-01T12:00:00Z"
        )
        data = response.model_dump()
        assert data["type"] == "meeting_ended"
        assert data["message"] == "Meeting has ended"
        assert data["end_time"] == "2024-01-01T12:00:00Z"

    def test_meeting_not_started_response_structure(self):
        """Test MeetingNotStartedResponse has correct structure."""
        response = MeetingNotStartedResponse(
            message="Meeting not started", start_time="2024-01-01T12:00:00Z"
        )
        data = response.model_dump()
        assert data["type"] == "meeting_not_started"
        assert data["message"] == "Meeting not started"
        assert data["start_time"] == "2024-01-01T12:00:00Z"

    def test_meeting_countdown_response_structure(self):
        """Test MeetingCountdownResponse has correct structure."""
        response = MeetingCountdownResponse(
            meeting_id="m123",
            start_time="2024-01-01T12:00:00Z",
            server_time="2024-01-01T11:45:00Z",
            city_name="New York",
            meeting_room_name="Conference Room A",
        )
        data = response.model_dump()
        assert data["type"] == "meeting_countdown"
        assert data["meeting_id"] == "m123"
        assert data["start_time"] == "2024-01-01T12:00:00Z"
        assert data["server_time"] == "2024-01-01T11:45:00Z"
        assert data["city_name"] == "New York"
        assert data["meeting_room_name"] == "Conference Room A"

    def test_meeting_countdown_response_optional_fields(self):
        """Test MeetingCountdownResponse with optional fields as None."""
        response = MeetingCountdownResponse(
            meeting_id="m123",
            start_time="2024-01-01T12:00:00Z",
            server_time="2024-01-01T11:45:00Z",
        )
        data = response.model_dump()
        assert data["city_name"] is None
        assert data["meeting_room_name"] is None

    def test_response_json_serialization(self):
        """Test that responses can be serialized to JSON."""
        response = JoinedResponse(participant_id="p123", meeting_id="m456")
        json_str = response.model_dump_json()
        assert isinstance(json_str, str)
        assert "joined" in json_str
        assert "p123" in json_str
        assert "m456" in json_str


class TestSnapshotMessage:
    """Tests for SnapshotMessage broadcast model."""

    def test_snapshot_message_structure(self):
        """Test SnapshotMessage has correct structure."""
        from datetime import UTC, datetime

        from app.schema.engagement import EngagementSummary

        summary = EngagementSummary(
            meeting_id="m123",
            start=datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
            end=datetime(2024, 1, 1, 13, 0, 0, tzinfo=UTC),
            bucket_minutes=5,
            window_minutes=30,
            overall=[],
            participants=[],
        )
        message = SnapshotMessage(data=summary)
        data = message.model_dump()
        assert data["type"] == "snapshot"
        assert data["data"]["meeting_id"] == "m123"

    def test_snapshot_message_json_serialization(self):
        """Test that SnapshotMessage can be serialized to JSON."""
        from datetime import UTC, datetime

        from app.schema.engagement import EngagementSummary

        summary = EngagementSummary(
            meeting_id="m123",
            start=datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
            end=datetime(2024, 1, 1, 13, 0, 0, tzinfo=UTC),
            bucket_minutes=5,
            window_minutes=30,
            overall=[],
            participants=[],
        )
        message = SnapshotMessage(data=summary)
        json_str = message.model_dump_json()
        assert isinstance(json_str, str)
        assert "snapshot" in json_str
        assert "m123" in json_str

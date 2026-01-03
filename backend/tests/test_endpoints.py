"""Endpoint tests for the meeting API.

Tests cover the simplified architecture:
- Visit endpoint (meeting discovery, no participant creation)
- Meeting listing
- Status updates via WebSocket are tested separately
"""

import logging
from datetime import UTC, datetime, timedelta, timezone

from litestar.testing import TestClient

logging.basicConfig(level=logging.DEBUG)


def test_meeting_creation_via_visit(app, monkeypatch):
    """Test that visiting creates/returns a meeting for the current time slot."""
    # Fixed time at 13:58 - should snap to 14:00 (nearest 30 min boundary)
    fixed_now = datetime(2025, 1, 1, 13, 58, tzinfo=UTC)

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr("app.controllers.meetings.datetime", FixedDateTime)
    monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)

    with TestClient(app, raise_server_exceptions=True) as client:
        # Create meeting via visit with Teams link (required context)
        visit_resp = client.post(
            "/visit", json={"ms_teams_input": "https://teams.microsoft.com/meet/test123"}
        )
        assert visit_resp.status_code in (200, 201)
        visit = visit_resp.json()

        # Time snapping: 13:58 should round to 14:00 (nearest 30 min)
        assert visit["meeting_start"].startswith("2025-01-01T14:00")
        assert visit["meeting_end"].startswith("2025-01-01T15:00")
        assert "meeting_id" in visit
        assert visit["meeting_start"].endswith("Z")
        assert visit["meeting_end"].endswith("Z")

        # Visit response no longer includes participant_id
        # Participant creation happens via WebSocket join
        assert "participant_id" not in visit


def test_meeting_list(app, monkeypatch):
    """Test meeting listing with pagination."""
    fixed_now = datetime(2025, 1, 1, 13, 58, tzinfo=UTC)

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)

    with TestClient(app, raise_server_exceptions=True) as client:
        # Create a meeting first with Teams link
        client.post("/visit", json={"ms_teams_input": "https://teams.microsoft.com/meet/test456"})

        # List meetings with pagination defaults
        list_resp = client.get("/meetings")
        assert list_resp.status_code == 200
        payload = list_resp.json()
        assert payload["page_size"] == 20
        assert payload["total"] >= 1
        assert len(payload["items"]) >= 1


def test_time_slot_snapping(app, monkeypatch):
    """Test that different times snap correctly to 30-min boundaries."""
    test_cases = [
        # (input_time, expected_start)
        (datetime(2025, 1, 1, 10, 0, tzinfo=UTC), "2025-01-01T10:00"),  # :00 -> :00
        (datetime(2025, 1, 1, 10, 10, tzinfo=UTC), "2025-01-01T10:00"),  # :10 -> :00
        (datetime(2025, 1, 1, 10, 15, tzinfo=UTC), "2025-01-01T10:00"),  # :15 -> :00
        (datetime(2025, 1, 1, 10, 16, tzinfo=UTC), "2025-01-01T10:30"),  # :16 -> :30
        (datetime(2025, 1, 1, 10, 30, tzinfo=UTC), "2025-01-01T10:30"),  # :30 -> :30
        (datetime(2025, 1, 1, 10, 44, tzinfo=UTC), "2025-01-01T10:30"),  # :44 -> :30
        (datetime(2025, 1, 1, 10, 45, tzinfo=UTC), "2025-01-01T11:00"),  # :45 -> next :00
        (datetime(2025, 1, 1, 10, 59, tzinfo=UTC), "2025-01-01T11:00"),  # :59 -> next :00
    ]

    for i, (fixed_now, expected_start) in enumerate(test_cases):

        class FixedDateTime(datetime):
            _fixed = fixed_now  # Bind loop variable to class attribute

            @classmethod
            def now(cls, tz=None):
                return cls._fixed

        monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)

        with TestClient(app, raise_server_exceptions=True) as client:
            # Use different Teams link for each test case to avoid collisions
            visit_resp = client.post(
                "/visit", json={"ms_teams_input": f"https://teams.microsoft.com/meet/test{i}"}
            )
            assert visit_resp.status_code in (200, 201)
            visit = visit_resp.json()
            assert visit["meeting_start"].startswith(expected_start), (
                f"Time {fixed_now.isoformat()} should snap to {expected_start}, "
                f"got {visit['meeting_start']}"
            )


def test_visit_uses_local_timezone_for_snapping(app, monkeypatch):
    """Visit should snap based on local timezone, then convert to UTC for storage."""
    local_tz = timezone(timedelta(hours=2))  # UTC+2
    fixed_now = datetime(2025, 1, 1, 9, 5, tzinfo=local_tz)  # local 09:05 -> snap to 09:00 local

    class FixedDateTime(datetime):
        _fixed = fixed_now

        @classmethod
        def now(cls, tz=None):
            # Ignore tz arg to mimic datetime.now(tz) behavior with fixed tzinfo
            return cls._fixed

    monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)
    monkeypatch.setattr("app.services.meeting_service.datetime", FixedDateTime)

    with TestClient(app, raise_server_exceptions=True) as client:
        visit_resp = client.post(
            "/visit", json={"ms_teams_input": "https://teams.microsoft.com/meet/timezone_test"}
        )
        assert visit_resp.status_code in (200, 201)
        visit = visit_resp.json()
        # 09:00 local UTC+2 -> 07:00 UTC stored/returned
        assert visit["meeting_start"].startswith("2025-01-01T07:00")
        assert visit["meeting_start"].endswith("Z")


def test_deterministic_meeting_id(app, monkeypatch):
    """Test that the same time slot with same context produces the same meeting ID."""
    fixed_now = datetime(2025, 1, 1, 10, 0, tzinfo=UTC)

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)

    with TestClient(app, raise_server_exceptions=True) as client:
        teams_link = "https://teams.microsoft.com/meet/deterministic_test"

        # First visit
        resp1 = client.post("/visit", json={"ms_teams_input": teams_link})
        meeting_id_1 = resp1.json()["meeting_id"]

        # Second visit at same time with same Teams link should return same meeting
        resp2 = client.post("/visit", json={"ms_teams_input": teams_link})
        meeting_id_2 = resp2.json()["meeting_id"]

        assert meeting_id_1 == meeting_id_2

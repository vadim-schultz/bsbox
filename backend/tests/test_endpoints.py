from datetime import datetime

from litestar.testing import TestClient

def test_meeting_creation_and_status_flow(app, monkeypatch):
    fixed_now = datetime(2025, 1, 1, 13, 58)

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr("app.controllers.meetings.datetime", FixedDateTime)
    monkeypatch.setattr("app.controllers.users.datetime", FixedDateTime)
    monkeypatch.setattr("app.controllers.visit.datetime", FixedDateTime)

    with TestClient(app) as client:
        # Create meeting via visit (detect start and participant)
        visit_resp = client.post("/visit", json={"device_fingerprint": "test-device"})
        assert visit_resp.status_code in (200, 201)
        visit = visit_resp.json()
        assert visit["meeting_start"].startswith("2025-01-01T14:00")
        assert visit["meeting_end"].startswith("2025-01-01T15:00")

        # List meetings with pagination defaults
        list_resp = client.get("/meetings")
        assert list_resp.status_code == 200
        payload = list_resp.json()
        assert payload["page_size"] == 20
        assert payload["total"] == 1
        assert len(payload["items"]) == 1

        # Change status, creating anonymous participant if needed
        status_resp = client.post(
            "/users/status",
            json={
                "meeting_id": visit["meeting_id"],
                "participant_id": visit["participant_id"],
                "status": "engaged",
            },
        )
        assert status_resp.status_code in (200, 201)
        participant = status_resp.json()
        assert participant["meeting_id"] == visit["meeting_id"]
        assert participant["last_status"] == "engaged"
        assert len(participant["engagement_samples"]) == 1
        assert participant["engagement_samples"][0]["bucket"].startswith(
            fixed_now.replace(second=0, microsecond=0).isoformat()
        )


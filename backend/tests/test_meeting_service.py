from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.meeting import MeetingEventRequest
from app.services.meeting_service import MeetingService
from app.utils.hotspot_monitor import HotspotClient


@pytest.mark.asyncio
async def test_ingest_connection_snapshot_creates_meeting(session, settings):
    service = MeetingService(session=session, settings=settings)

    metrics = await service.ingest_connection_snapshot(
        [HotspotClient(mac_address="aa:bb:cc:dd:ee:ff", signal_strength=-40)]
    )

    assert metrics.participant_count == 1
    assert metrics.participants[0].visitor_id == "aa:bb:cc:dd:ee:ff"


@pytest.mark.asyncio
async def test_record_event_returns_updated_metrics(session, settings):
    service = MeetingService(session=session, settings=settings)

    metrics = await service.record_event(
        data=MeetingEventRequest(
            visitor_id="11:22:33:44:55:66",
            is_speaking=True,
            is_relevant=False,
            timestamp=None,
        )
    )

    assert metrics.speakers == 1
    assert metrics.relevance_score == 0


@pytest.mark.asyncio
async def test_current_analytics_reflects_latest_state(session, settings):
    service = MeetingService(session=session, settings=settings)

    await service.record_event(
        data=MeetingEventRequest(
            visitor_id="11:22:33:44:55:66",
            is_speaking=True,
            is_relevant=True,
            timestamp=datetime.now(timezone.utc),
        )
    )

    metrics = await service.current_analytics()

    assert metrics.participant_count == 1
    assert metrics.speakers == 1
    assert metrics.relevance_score == 1


@pytest.mark.asyncio
async def test_historical_analytics_respects_history_limit(session, settings):
    settings.history_limit = 2
    service = MeetingService(session=session, settings=settings)

    base_time = datetime.now(timezone.utc)
    for index in range(3):
        await service.ingest_connection_snapshot(
            [
                HotspotClient(
                    mac_address=f"00:11:22:33:44:{index:02x}", signal_strength=-40
                )
            ],
            timestamp=base_time - timedelta(minutes=index * 15),
        )

    history = await service.historical_analytics(limit=5)

    assert len(history) == 2

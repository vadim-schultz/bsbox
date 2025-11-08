from datetime import datetime, timedelta

import pytest

from app.schemas.meeting import MeetingAnalyticsResponse, MeetingEventRequest, ParticipantSnapshot
from app.services.meeting_service import MeetingService
from app.utils.hotspot_monitor import HotspotClient


@pytest.mark.asyncio
async def test_ingest_connection_snapshot_creates_meeting(session, settings, fake_redis):
    service = MeetingService(session=session, redis=fake_redis, settings=settings)

    metrics = await service.ingest_connection_snapshot(
        [HotspotClient(mac_address="aa:bb:cc:dd:ee:ff", signal_strength=-40)]
    )

    assert metrics.participant_count == 1
    assert metrics.participants[0].visitor_id == "aa:bb:cc:dd:ee:ff"


@pytest.mark.asyncio
async def test_record_event_updates_cache(session, settings, fake_redis):
    service = MeetingService(session=session, redis=fake_redis, settings=settings)

    await service.record_event(
        data=MeetingEventRequest(
            visitor_id="11:22:33:44:55:66",
            is_speaking=True,
            is_relevant=False,
            timestamp=None,
        )
    )

    cached = await fake_redis.get("active_meeting_metrics")
    assert cached is not None


@pytest.mark.asyncio
async def test_current_analytics_prefers_cache(session, settings, fake_redis):
    service = MeetingService(session=session, redis=fake_redis, settings=settings)

    cached = MeetingAnalyticsResponse(
        meeting_id="cached",
        participant_count=1,
        speakers=1,
        relevance_score=1.0,
        speaking_score=1.0,
        timestamp=datetime.utcnow(),
        participants=[
            ParticipantSnapshot(
                visitor_id="aa:bb:cc:dd:ee:ff",
                display_name=None,
                signal_strength=-30,
                is_speaking=True,
                is_relevant=True,
            )
        ],
    )
    await fake_redis.set("active_meeting_metrics", cached.model_dump_json())

    metrics = await service.current_analytics()

    assert metrics.meeting_id == "cached"
    assert metrics.participant_count == 1


@pytest.mark.asyncio
async def test_historical_analytics_respects_history_limit(session, settings, fake_redis):
    settings.history_limit = 2
    service = MeetingService(session=session, redis=fake_redis, settings=settings)

    base_time = datetime.utcnow()
    for index in range(3):
        await service.ingest_connection_snapshot(
            [HotspotClient(mac_address=f"00:11:22:33:44:{index:02x}", signal_strength=-40)],
            timestamp=base_time - timedelta(minutes=index * 15),
        )

    history = await service.historical_analytics(limit=5)

    assert len(history) == 2


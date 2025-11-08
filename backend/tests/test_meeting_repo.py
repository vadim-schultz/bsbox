from datetime import datetime, timedelta

import pytest

from app.repos.meeting_repo import MeetingRepository


@pytest.mark.asyncio
async def test_get_or_create_active_meeting_reuses_existing(session):
    repo = MeetingRepository(session)

    now = datetime(2024, 1, 1, 12, 5)
    meeting = await repo.get_or_create_active_meeting(now)
    duplicate = await repo.get_or_create_active_meeting(now)

    assert duplicate.id == meeting.id
    assert meeting.scheduled_start.minute == 0


@pytest.mark.asyncio
async def test_current_metrics_counts_recent_engagement(session):
    repo = MeetingRepository(session)

    now = datetime.utcnow()
    meeting = await repo.get_or_create_active_meeting(now)
    participant = await repo.upsert_participant(
        device_id="aa:bb:cc:dd:ee:ff",
        signal_strength=-42,
        seen_at=now,
    )
    await repo.attach_participant_to_meeting(meeting, participant)

    await repo.record_connection_events(
        meeting=meeting,
        participants=[(participant, True, -42)],
        timestamp=now,
    )
    await repo.persist_engagement_event(
        meeting=meeting,
        participant=participant,
        is_speaking=True,
        is_relevant=True,
        timestamp=now,
    )

    await repo.session.commit()
    await repo.session.refresh(meeting, attribute_names=["participants"])

    metrics = await repo.current_metrics(meeting)

    assert metrics.participant_count == 1
    assert metrics.speakers == 1
    assert metrics.participants[0].is_relevant


@pytest.mark.asyncio
async def test_update_meeting_end_sets_actual_end(session):
    repo = MeetingRepository(session)

    now = datetime.utcnow()
    meeting = await repo.get_or_create_active_meeting(now)

    ended_at = now + timedelta(minutes=30)
    await repo.update_meeting_end(meeting.id, ended_at)

    await repo.session.commit()
    refreshed = await repo.session.get(type(meeting), meeting.id)

    assert refreshed.actual_end == ended_at


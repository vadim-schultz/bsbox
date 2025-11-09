from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..repos.meeting_repo import MeetingRepository
from ..schemas.meeting import MeetingAnalyticsResponse, MeetingEventRequest
from ..utils.hotspot_monitor import HotspotClient


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class MeetingService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._repository = MeetingRepository(session)
        self._settings = settings

    async def record_event(self, data: MeetingEventRequest) -> MeetingAnalyticsResponse:
        now = _coerce_utc(data.timestamp)
        meeting = await self._repository.get_or_create_active_meeting(now)
        participant = await self._repository.upsert_participant(
            device_id=data.visitor_id,
            signal_strength=None,
            seen_at=now,
        )
        await self._repository.attach_participant_to_meeting(meeting, participant)
        await self._repository.persist_engagement_event(
            meeting=meeting,
            participant=participant,
            is_speaking=data.is_speaking,
            is_relevant=data.is_relevant,
            timestamp=now,
        )
        await self._repository.session.commit()
        await self._repository.session.refresh(meeting, attribute_names=["participants"])
        return await self._repository.current_metrics(meeting)

    async def current_analytics(self) -> MeetingAnalyticsResponse:
        now = _utcnow()
        meeting = await self._repository.get_or_create_active_meeting(now)
        await self._repository.session.refresh(meeting, attribute_names=["participants"])
        return await self._repository.current_metrics(meeting)

    async def historical_analytics(self, limit: int = 10) -> list[MeetingAnalyticsResponse]:
        limit = min(limit, self._settings.history_limit)
        meetings = await self._repository.historical_metrics(limit=limit)
        return list(meetings)

    async def ingest_connection_snapshot(
        self,
        clients: Iterable[HotspotClient],
        timestamp: datetime | None = None,
    ) -> MeetingAnalyticsResponse:
        now = _coerce_utc(timestamp)
        meeting = await self._repository.get_or_create_active_meeting(now)
        participant_bindings = []

        client_list = list(clients)
        for client in client_list:
            participant = await self._repository.upsert_participant(
                device_id=client.mac_address,
                signal_strength=client.signal_strength,
                seen_at=now,
            )
            await self._repository.attach_participant_to_meeting(meeting, participant)
            participant_bindings.append((participant, True, client.signal_strength))

        await self._repository.record_connection_events(
            meeting=meeting,
            participants=participant_bindings,
            timestamp=now,
        )

        if len(client_list) < self._settings.meeting_threshold:
            await self._repository.update_meeting_end(meeting.id, now)

        await self._repository.session.commit()
        await self._repository.session.refresh(meeting, attribute_names=["participants"])
        return await self._repository.current_metrics(meeting)


async def provide_meeting_service(
    session: AsyncSession,
    settings: Settings,
) -> MeetingService:
    return MeetingService(session=session, settings=settings)


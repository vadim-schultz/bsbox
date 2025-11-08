from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, Sequence

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import ConnectionEvent, EngagementEvent, Meeting, Participant
from ..schemas.meeting import MeetingAnalyticsResponse, ParticipantSnapshot

MEETING_SLOT_MINUTES = 30


class MeetingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_active_meeting(self, now: datetime) -> Meeting:
        scheduled_start = now.replace(minute=0 if now.minute < MEETING_SLOT_MINUTES else 30, second=0, microsecond=0)

        stmt = (
            select(Meeting)
            .where(Meeting.scheduled_start == scheduled_start)
            .options(selectinload(Meeting.participants))
        )
        meeting = (await self.session.execute(stmt)).scalars().first()
        if meeting:
            return meeting

        meeting = Meeting(scheduled_start=scheduled_start, actual_start=now)
        self.session.add(meeting)
        await self.session.flush()
        return meeting

    async def upsert_participant(
        self,
        device_id: str,
        signal_strength: int | None,
        seen_at: datetime,
    ) -> Participant:
        stmt = select(Participant).where(Participant.device_id == device_id)
        participant = (await self.session.execute(stmt)).scalars().first()
        if participant:
            participant.last_seen = seen_at
            participant.signal_strength = signal_strength
        else:
            participant = Participant(device_id=device_id, last_seen=seen_at, signal_strength=signal_strength)
            self.session.add(participant)
            await self.session.flush()
        return participant

    async def attach_participant_to_meeting(self, meeting: Meeting, participant: Participant) -> None:
        if participant not in meeting.participants:
            meeting.participants.append(participant)
            await self.session.flush()

    async def record_connection_events(
        self,
        meeting: Meeting,
        participants: Iterable[tuple[Participant, bool, int | None]],
        timestamp: datetime,
    ) -> None:
        for participant, is_connected, signal_strength in participants:
            event = ConnectionEvent(
                meeting_id=meeting.id,
                participant_id=participant.id,
                timestamp=timestamp,
                is_connected=is_connected,
                signal_strength=signal_strength,
            )
            self.session.add(event)

    async def persist_engagement_event(
        self,
        meeting: Meeting,
        participant: Participant,
        is_speaking: bool,
        is_relevant: bool,
        timestamp: datetime,
    ) -> EngagementEvent:
        event = EngagementEvent(
            meeting_id=meeting.id,
            participant_id=participant.id,
            timestamp=timestamp,
            is_speaking=is_speaking,
            is_relevant=is_relevant,
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def update_meeting_end(self, meeting_id: str, ended_at: datetime) -> None:
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        meeting = (await self.session.execute(stmt)).scalar_one_or_none()
        if meeting and meeting.actual_end is None:
            meeting.actual_end = ended_at
            meeting.updated_at = datetime.utcnow()

    async def current_metrics(self, meeting: Meeting) -> MeetingAnalyticsResponse:
        now = datetime.utcnow()
        speaking_stmt = (
            select(func.count(func.distinct(EngagementEvent.participant_id)))
            .where(
                EngagementEvent.meeting_id == meeting.id,
                EngagementEvent.is_speaking.is_(True),
                EngagementEvent.timestamp >= now - timedelta(minutes=5),
            )
        )
        speaking_count = (await self.session.execute(speaking_stmt)).scalar_one() or 0

        relevance_stmt = (
            select(func.count(func.distinct(EngagementEvent.participant_id)))
            .where(
                EngagementEvent.meeting_id == meeting.id,
                EngagementEvent.is_relevant.is_(True),
                EngagementEvent.timestamp >= now - timedelta(minutes=5),
            )
        )
        relevance_count = (await self.session.execute(relevance_stmt)).scalar_one() or 0

        participant_count = len(meeting.participants)
        relevance_score = relevance_count / participant_count if participant_count else 0.0
        speaking_score = speaking_count / participant_count if participant_count else 0.0

        snapshot = await self._participant_snapshot(meeting.id)

        return MeetingAnalyticsResponse(
            meeting_id=str(meeting.id),
            participant_count=participant_count,
            speakers=speaking_count,
            relevance_score=round(relevance_score, 2),
            speaking_score=round(speaking_score, 2),
            timestamp=now,
            participants=snapshot,
        )

    async def historical_metrics(self, limit: int = 10) -> Sequence[MeetingAnalyticsResponse]:
        stmt = select(Meeting).order_by(desc(Meeting.actual_start)).limit(limit).options(
            selectinload(Meeting.participants)
        )
        meetings = (await self.session.execute(stmt)).scalars().all()
        metrics: list[MeetingAnalyticsResponse] = []
        for meeting in meetings:
            metrics.append(await self.current_metrics(meeting))
        return metrics

    async def _participant_snapshot(self, meeting_id: str) -> list[ParticipantSnapshot]:
        stmt = (
            select(Participant, func.max(ConnectionEvent.signal_strength))
            .join(ConnectionEvent, ConnectionEvent.participant_id == Participant.id)
            .where(ConnectionEvent.meeting_id == meeting_id)
            .group_by(Participant.id)
        )
        results = await self.session.execute(stmt)
        snapshots: list[ParticipantSnapshot] = []
        now = datetime.utcnow()
        for participant, strength in results.all():
            snapshots.append(
                ParticipantSnapshot(
                    visitor_id=participant.device_id,
                    display_name=None,
                    signal_strength=strength,
                    is_speaking=await self._is_recent_engagement(meeting_id, participant.id, "speaking", now),
                    is_relevant=await self._is_recent_engagement(meeting_id, participant.id, "relevant", now),
                )
            )
        return snapshots

    async def _is_recent_engagement(
        self,
        meeting_id: str,
        participant_id: str,
        kind: str,
        now: datetime,
    ) -> bool:
        column = getattr(EngagementEvent, "is_speaking" if kind == "speaking" else "is_relevant")
        stmt = (
            select(func.count(EngagementEvent.id))
            .where(
                EngagementEvent.meeting_id == meeting_id,
                EngagementEvent.participant_id == participant_id,
                column.is_(True),
                EngagementEvent.timestamp >= now - timedelta(minutes=5),
            )
        )
        return ((await self.session.execute(stmt)).scalar_one() or 0) > 0


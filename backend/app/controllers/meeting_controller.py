import asyncio
from collections.abc import AsyncIterator

from litestar import Controller, get, post
from litestar.response import EventSourceResponse

from ..schemas.meeting import MeetingAnalyticsResponse, MeetingEventRequest
from ..services.meeting_service import MeetingService


class MeetingController(Controller):
    path = "/meetings"

    @post(path="/events")
    async def record_event(
        self,
        data: MeetingEventRequest,
        meeting_service: MeetingService,
    ) -> MeetingAnalyticsResponse:
        """Record speaking/relevance toggles and return updated meeting stats."""
        return await meeting_service.record_event(data)

    @get(path="/analytics")
    async def list_analytics(
        self,
        meeting_service: MeetingService,
    ) -> MeetingAnalyticsResponse:
        """Return analytics for the current or most recent meeting."""
        return await meeting_service.current_analytics()

    @get(path="/analytics/history")
    async def list_history(
        self,
        meeting_service: MeetingService,
        limit: int = 10,
    ) -> list[MeetingAnalyticsResponse]:
        """Return historical analytics for recent meetings."""
        return await meeting_service.historical_analytics(limit=limit)

    @get(path="/analytics/stream")
    async def stream_analytics(
        self,
        meeting_service: MeetingService,
    ) -> EventSourceResponse:
        """Server-sent events stream providing near-realtime analytics."""

        async def event_generator() -> AsyncIterator[str]:
            while True:
                metrics = await meeting_service.current_analytics()
                yield f"data: {metrics.model_dump_json()}\n\n"
                await asyncio.sleep(5)

        return EventSourceResponse(event_generator())


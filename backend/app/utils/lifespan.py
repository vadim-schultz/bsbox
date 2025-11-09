from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from litestar.types import LifespanHook

from ..config.settings import Settings
from ..database import get_session_factory, init_models
from ..services.meeting_service import MeetingService
from .hotspot_monitor import HotspotMonitor


def lifespan(settings: Settings) -> LifespanHook:
    @contextlib.asynccontextmanager
    async def handler(app: Any) -> AsyncIterator[None]:
        await init_models(settings)
        session_factory = get_session_factory(settings)
        polling_task: asyncio.Task[None] | None = None
        monitor: HotspotMonitor | None = None
        if settings.polling_enabled:
            monitor = HotspotMonitor(
                interface=settings.hotspot_interface,
                poll_interval=settings.poll_interval_seconds,
            )

            async def polling_job() -> None:
                while True:
                    snapshot = await monitor.poll_once()
                    async with session_factory() as session:
                        service = MeetingService(session=session, settings=settings)
                        await service.ingest_connection_snapshot(snapshot)
                    await asyncio.sleep(settings.poll_interval_seconds)

            polling_task = asyncio.create_task(polling_job())

        state = getattr(app, "state", None)
        if state is None:
            state = SimpleNamespace()
            setattr(app, "state", state)
        state.hotspot_monitor = monitor
        state.polling_task = polling_task

        try:
            yield
        finally:
            if polling_task:
                polling_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await polling_task

    return handler

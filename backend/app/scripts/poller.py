from __future__ import annotations

import argparse
import asyncio
import logging

from app.cache import get_redis
from app.config import get_settings
from app.database import get_session_factory
from app.services.meeting_service import MeetingService
from app.utils.hotspot_monitor import HotspotMonitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_polling(interface: str | None = None, interval: int | None = None) -> None:
    settings = get_settings()
    if interface:
        settings.hotspot_interface = interface  # type: ignore[attr-defined]
    if interval:
        settings.poll_interval_seconds = interval  # type: ignore[attr-defined]

    redis = await get_redis(settings)
    session_factory = get_session_factory(settings)
    monitor = HotspotMonitor(
        interface=settings.hotspot_interface,
        poll_interval=settings.poll_interval_seconds,
    )

    logger.info("Starting hotspot polling on %s every %ss", settings.hotspot_interface, settings.poll_interval_seconds)

    while True:
        snapshot = await monitor.poll_once()
        logger.debug("Captured %d clients", len(snapshot))
        async with session_factory() as session:
            service = MeetingService(session=session, redis=redis, settings=settings)
            await service.ingest_connection_snapshot(snapshot)
        await asyncio.sleep(settings.poll_interval_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run hotspot polling loop.")
    parser.add_argument("--interface", dest="interface", help="Wireless interface to monitor.")
    parser.add_argument("--interval", dest="interval", type=int, help="Polling interval seconds.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run_polling(interface=args.interface, interval=args.interval))


if __name__ == "__main__":
    main()


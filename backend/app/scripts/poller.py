from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path

from app.config import get_settings
from app.database import get_session_factory
from app.services.meeting_service import MeetingService
from app.utils.hotspot_monitor import HotspotMonitor, HotspotClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_polling(
    interface: str | None = None,
    interval: int | None = None,
    sample_path: Path | None = None,
) -> None:
    settings = get_settings()
    if interface:
        settings.hotspot_interface = interface  # type: ignore[attr-defined]
    if interval:
        settings.poll_interval_seconds = interval  # type: ignore[attr-defined]

    session_factory = get_session_factory(settings)

    sample_clients: list[HotspotClient] | None = None
    monitor: HotspotMonitor | None = None

    if sample_path:
        data = json.loads(sample_path.read_text())
        sample_clients = [
            HotspotClient(
                mac_address=entry["mac_address"],
                signal_strength=entry.get("signal_strength"),
            )
            for entry in data
        ]
        logger.info("Using sample data from %s", sample_path)
    else:
        monitor = HotspotMonitor(
            interface=settings.hotspot_interface,
            poll_interval=settings.poll_interval_seconds,
        )
        logger.info(
            "Starting hotspot polling on %s every %ss",
            settings.hotspot_interface,
            settings.poll_interval_seconds,
        )

    while True:
        if sample_clients is not None:
            snapshot = sample_clients
        else:
            try:
                snapshot = await monitor.poll_once()  # type: ignore[union-attr]
            except FileNotFoundError:
                logger.error(
                    "Wireless tools not available. Provide --sample or disable polling.",
                )
                await asyncio.sleep(settings.poll_interval_seconds)
                continue

        logger.debug("Captured %d clients", len(snapshot))
        async with session_factory() as session:
            service = MeetingService(session=session, settings=settings)
            await service.ingest_connection_snapshot(snapshot)

        await asyncio.sleep(settings.poll_interval_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run hotspot polling loop.")
    parser.add_argument("--interface", dest="interface", help="Wireless interface to monitor.")
    parser.add_argument("--interval", dest="interval", type=int, help="Polling interval seconds.")
    parser.add_argument(
        "--sample",
        type=Path,
        help="Path to JSON array of hotspot clients for offline simulation.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run_polling(interface=args.interface, interval=args.interval, sample_path=args.sample))


if __name__ == "__main__":
    main()


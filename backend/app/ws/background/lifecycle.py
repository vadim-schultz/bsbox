"""Lifecycle management for periodic broadcaster."""

import logging

from litestar import Litestar
from litestar.channels import ChannelsPlugin
from sqlalchemy.orm import sessionmaker

from app.ws.background.factory import BroadcasterFactory
from app.ws.background.periodic_broadcaster import PeriodicBroadcaster

logger = logging.getLogger(__name__)

# Global periodic broadcaster instance
_periodic_broadcaster: PeriodicBroadcaster | None = None


async def start_broadcaster(
    app: Litestar, session_factory: sessionmaker, interval_seconds: int = 10
) -> None:
    """Start background task for periodic engagement broadcasts.

    Args:
        app: Litestar application instance
        session_factory: SQLAlchemy session factory
        interval_seconds: Broadcast interval in seconds
    """
    global _periodic_broadcaster

    # Get channels plugin from app
    channels = app.plugins.get(ChannelsPlugin)
    if not channels:
        raise RuntimeError("ChannelsPlugin not found in application")

    # Use factory to create broadcaster
    _periodic_broadcaster = BroadcasterFactory.create(
        channels=channels,
        session_factory=session_factory,
        interval_seconds=interval_seconds,
    )

    await _periodic_broadcaster.start()
    logger.info("Periodic broadcaster started")


async def stop_broadcaster(app: Litestar) -> None:
    """Stop periodic broadcaster on shutdown.

    Args:
        app: Litestar application instance
    """
    global _periodic_broadcaster
    if _periodic_broadcaster:
        await _periodic_broadcaster.stop()
        logger.info("Periodic broadcaster stopped")

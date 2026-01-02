"""Factory for creating the periodic broadcaster."""

from collections.abc import Callable

from litestar.channels import ChannelsPlugin
from sqlalchemy.orm import Session

from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing import SmoothingAlgorithm, SmoothingFactory
from app.ws.background.periodic_broadcaster import PeriodicBroadcaster
from app.ws.repos.broadcast import BroadcastRepo


class BroadcasterFactory:
    """Factory for creating and managing the periodic broadcaster.

    Uses the same dependency injection patterns as the rest of the application,
    avoiding manual service instantiation.
    """

    @staticmethod
    def create(
        channels: ChannelsPlugin,
        session_factory: Callable[[], Session],
        interval_seconds: int = 10,
    ) -> PeriodicBroadcaster:
        """Create a PeriodicBroadcaster with all dependencies.

        Args:
            channels: Litestar channels plugin for broadcasting
            session_factory: Factory function to create database sessions
            interval_seconds: Broadcast interval in seconds

        Returns:
            Configured PeriodicBroadcaster instance
        """
        # Create broadcast repo from channels
        broadcast_repo = BroadcastRepo(channels)

        # Create engagement service using DI pattern (session-independent components)
        bucket_manager = BucketManager()
        smoothing_strategy = SmoothingFactory.create(SmoothingAlgorithm.KALMAN)

        # Note: repos and engagement_service will be recreated per-broadcast
        # using session_factory. We only need them here to pass to broadcaster.
        # The broadcaster itself will create sessions and repos as needed.

        return PeriodicBroadcaster(
            session_factory=session_factory,
            broadcast_repo=broadcast_repo,
            bucket_manager=bucket_manager,
            smoothing_strategy=smoothing_strategy,
            interval_seconds=interval_seconds,
        )

"""WebSocket service factory."""

from typing import cast

from sqlalchemy.orm import Session

from app.repos import EngagementRepo, ParticipantRepo
from app.services import EngagementService, ParticipantService
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing import SmoothingAlgorithm, SmoothingFactory
from app.services.engagement.summary import SnapshotBuilder
from app.ws.repos.broadcast import BroadcastRepo
from app.ws.services.join import JoinService
from app.ws.services.leave import LeaveService
from app.ws.services.ping import PingService
from app.ws.services.protocol import WSService
from app.ws.services.status import StatusService


class WSServiceFactory:
    """Factory for creating WebSocket message services.

    Responsible for constructing service instances with their dependencies,
    including domain services and the broadcast repository.
    """

    def __init__(self, session: Session, broadcast_repo: BroadcastRepo) -> None:
        """Initialize service factory with dependencies.

        Args:
            session: Database session for domain repos/services
            broadcast_repo: Repository for broadcasting operations
        """
        # Store for creating non-message services
        self.broadcast_repo = broadcast_repo

        # Initialize domain repos
        participant_repo = ParticipantRepo(session)
        engagement_repo = EngagementRepo(session)

        # Initialize domain services
        participant_service = ParticipantService(participant_repo)

        # Create engagement service components
        bucket_manager = BucketManager()
        smoothing_strategy = SmoothingFactory.create(SmoothingAlgorithm.KALMAN)
        snapshot_builder = SnapshotBuilder(
            engagement_repo=engagement_repo,
            participant_repo=participant_repo,
            bucket_manager=bucket_manager,
            smoothing_strategy=smoothing_strategy,
        )

        self.engagement_service = EngagementService(
            engagement_repo=engagement_repo,
            participant_repo=participant_repo,
            bucket_manager=bucket_manager,
            snapshot_builder=snapshot_builder,
        )

        # Register message handler services (cast to protocol type for mypy)
        self._services: dict[str, WSService] = {
            "join": cast(
                WSService,
                JoinService(participant_service, self.engagement_service, broadcast_repo),
            ),
            "status": cast(
                WSService,
                StatusService(self.engagement_service, broadcast_repo),
            ),
            "ping": cast(WSService, PingService()),
        }

    def get_service(self, message_type: str) -> WSService | None:
        """Get service for message type, or None if unknown.

        Args:
            message_type: Type of WebSocket message (e.g., 'join', 'status', 'ping')

        Returns:
            Service instance or None if message type not supported
        """
        return self._services.get(message_type)

    def create_leave_service(self) -> LeaveService:
        """Create a LeaveService instance.

        Used by the connection controller to handle participant disconnects.

        Returns:
            LeaveService instance with required dependencies
        """
        return LeaveService(self.engagement_service, self.broadcast_repo)

    @property
    def supported_types(self) -> list[str]:
        """List of supported message types.

        Returns:
            List of message type strings this factory can handle
        """
        return list(self._services.keys())

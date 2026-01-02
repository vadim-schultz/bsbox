from litestar.di import Provide
from sqlalchemy.orm import Session

from app.repos import CityRepo, EngagementRepo, MeetingRepo, MeetingRoomRepo, ParticipantRepo
from app.services import (
    CityService,
    EngagementService,
    MeetingRoomService,
    MeetingService,
    ParticipantService,
)
from app.services.engagement.bucketing import BucketManager
from app.services.engagement.smoothing import SmoothingAlgorithm, SmoothingFactory
from app.services.engagement.summary import SnapshotBuilder


def provide_meeting_service(session: Session) -> MeetingService:
    repo = MeetingRepo(session)
    return MeetingService(repo)


def provide_participant_service(session: Session) -> ParticipantService:
    repo = ParticipantRepo(session)
    return ParticipantService(repo)


def provide_engagement_service(session: Session) -> EngagementService:
    participant_repo = ParticipantRepo(session)
    engagement_repo = EngagementRepo(session)

    # Create components
    bucket_manager = BucketManager()
    smoothing_strategy = SmoothingFactory.create(SmoothingAlgorithm.KALMAN)
    snapshot_builder = SnapshotBuilder(
        engagement_repo=engagement_repo,
        participant_repo=participant_repo,
        bucket_manager=bucket_manager,
        smoothing_strategy=smoothing_strategy,
    )

    return EngagementService(
        engagement_repo=engagement_repo,
        participant_repo=participant_repo,
        bucket_manager=bucket_manager,
        snapshot_builder=snapshot_builder,
    )


def provide_city_service(session: Session) -> CityService:
    city_repo = CityRepo(session)
    return CityService(city_repo)


def provide_meeting_room_service(session: Session) -> MeetingRoomService:
    meeting_room_repo = MeetingRoomRepo(session)
    city_repo = CityRepo(session)
    return MeetingRoomService(meeting_room_repo, city_repo)


dependencies = {
    "meeting_service": Provide(provide_meeting_service, sync_to_thread=False),
    "participant_service": Provide(provide_participant_service, sync_to_thread=False),
    "engagement_service": Provide(provide_engagement_service, sync_to_thread=False),
    "city_service": Provide(provide_city_service, sync_to_thread=False),
    "meeting_room_service": Provide(provide_meeting_room_service, sync_to_thread=False),
}

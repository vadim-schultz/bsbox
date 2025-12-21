from litestar.di import Provide
from sqlalchemy.orm import Session

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo, CityRepo, MeetingRoomRepo
from app.services import EngagementService, MeetingService, ParticipantService, CityService, MeetingRoomService


def provide_meeting_service(session: Session) -> MeetingService:
    repo = MeetingRepo(session)
    return MeetingService(repo)


def provide_participant_service(session: Session) -> ParticipantService:
    repo = ParticipantRepo(session)
    return ParticipantService(repo)


def provide_engagement_service(session: Session) -> EngagementService:
    participant_repo = ParticipantRepo(session)
    engagement_repo = EngagementRepo(session)
    return EngagementService(engagement_repo, participant_repo)


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


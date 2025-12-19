from litestar.di import Provide
from sqlalchemy.orm import Session

from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
from app.services import EngagementService, MeetingService, ParticipantService


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


dependencies = {
    "meeting_service": Provide(provide_meeting_service, sync_to_thread=False),
    "participant_service": Provide(provide_participant_service, sync_to_thread=False),
    "engagement_service": Provide(provide_engagement_service, sync_to_thread=False),
}


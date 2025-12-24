from datetime import UTC, datetime

from litestar import Controller, post
from litestar.exceptions import HTTPException

from app.schema import VisitRequest, VisitResponse
from app.services import MeetingService, ParticipantService
from app.services.teams_parser import parse_teams_meeting


class VisitsController(Controller):
    path = "/visit"

    @post("/", sync_to_thread=False)
    def visit(
        self,
        data: VisitRequest,
        meeting_service: MeetingService,
        participant_service: ParticipantService,
    ) -> VisitResponse:
        now = datetime.now(tz=UTC)
        parsed = parse_teams_meeting(data.ms_teams_input)
        meeting = meeting_service.ensure_meeting_for_visit(
            now,
            city_id=data.city_id,
            meeting_room_id=data.meeting_room_id,
            ms_teams_thread_id=parsed["thread_id"],
            ms_teams_meeting_id=parsed["meeting_id"],
            ms_teams_invite_url=parsed["raw_url"],
        )
        participant = participant_service.get_or_create_active(
            meeting=meeting, now=now, device_fingerprint=data.device_fingerprint
        )
        if not participant:
            raise HTTPException(status_code=500, detail="Unable to create participant")

        return VisitResponse(
            meeting_id=meeting.id,
            participant_id=participant.id,
            meeting_start=meeting.start_ts,
            meeting_end=meeting.end_ts,
        )

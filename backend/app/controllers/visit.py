from datetime import datetime

from litestar import Controller, post
from litestar.exceptions import HTTPException

from app.schema import VisitRequest, VisitResponse
from app.services import MeetingService, ParticipantService


class VisitsController(Controller):
    path = "/visit"

    @post("/", sync_to_thread=False)
    def visit(
        self,
        data: VisitRequest,
        meeting_service: MeetingService,
        participant_service: ParticipantService,
    ) -> VisitResponse:
        now = datetime.now()
        meeting = meeting_service.ensure_meeting_for_visit(now)
        participant = participant_service.get_or_create_active(
            meeting=meeting, now=now, device_fingerprint=data.device_fingerprint
        )
        if not participant:
            raise HTTPException(status_code=500, detail="Unable to create participant")

        return VisitResponse(
            meeting_id=meeting.id,
            participant_id=participant.id,
            participant_expires_at=participant.expires_at,
            meeting_start=meeting.start_ts,
            meeting_end=meeting.end_ts,
        )


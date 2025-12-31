"""Visit controller for meeting discovery/creation.

The visit endpoint creates/finds a meeting for the current time slot.
Participant creation now happens via WebSocket connection.
"""

from datetime import UTC, datetime

from litestar import Controller, post

from app.schema import VisitRequest, VisitResponse
from app.services import MeetingService


class VisitsController(Controller):
    path = "/visit"

    @post("/", sync_to_thread=False)
    def visit(
        self,
        data: VisitRequest,
        meeting_service: MeetingService,
    ) -> VisitResponse:
        """Get or create meeting for the current time slot.

        Returns meeting details. Participant creation happens via WebSocket join.
        """
        # Use local time (with zone) for snapping; it will be normalized to UTC in the service
        now = datetime.now().astimezone()
        meeting = meeting_service.ensure_meeting(
            now,
            city_id=data.city_id,
            meeting_room_id=data.meeting_room_id,
            ms_teams=data.ms_teams,
        )

        return VisitResponse(
            meeting_id=meeting.id,
            meeting_start=meeting.start_ts,
            meeting_end=meeting.end_ts,
        )

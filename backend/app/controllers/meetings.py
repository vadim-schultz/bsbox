from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any

from litestar import Controller, get, post
from litestar.di import Provide
from litestar.exceptions import HTTPException

from app.schema.common.pagination import Paginated, PaginationParams
from app.schema.engagement.models import EngagementSummary
from app.schema.meeting.models import MeetingRead, MeetingWithParticipants
from app.services import MeetingService
from app.services.engagement_service import EngagementService


class MeetingsController(Controller):
    path = "/meetings"
    dependencies: Mapping[str, Provide | Callable[..., Any]] | None = None

    @get("/", sync_to_thread=False)
    def list_meetings(
        self,
        meeting_service: MeetingService,
        pagination: PaginationParams | None = None,
    ) -> Paginated[MeetingRead]:
        pagination = pagination or PaginationParams(page=1, page_size=20)
        items, total = meeting_service.list_meetings(pagination)
        return Paginated[MeetingRead](
            items=[m.to_read_schema() for m in items],
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
        )

    @post("/", sync_to_thread=False)
    def create_meeting(self, meeting_service: MeetingService) -> MeetingRead:
        meeting = meeting_service.ensure_meeting(datetime.now(tz=UTC))
        return meeting.to_read_schema()

    @get("/{meeting_id:str}", sync_to_thread=False)
    def get_meeting(
        self, meeting_id: str, meeting_service: MeetingService
    ) -> MeetingWithParticipants:
        meeting = meeting_service.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        return meeting.to_full_schema()

    @get("/{meeting_id:str}/engagement", sync_to_thread=False)
    def get_engagement(
        self,
        meeting_id: str,
        meeting_service: MeetingService,
        engagement_service: EngagementService,
    ) -> EngagementSummary:
        meeting = meeting_service.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        return engagement_service.build_engagement_summary(meeting)

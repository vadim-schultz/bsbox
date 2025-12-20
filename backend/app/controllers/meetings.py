from datetime import datetime

from litestar import Controller, get, patch, post
from litestar.exceptions import HTTPException

from app.models import Meeting
from app.schema import (
    EngagementPoint,
    EngagementSampleRead,
    EngagementSummary,
    MeetingRead,
    MeetingDurationUpdate,
    MeetingWithParticipants,
    PaginatedMeetings,
    PaginationParams,
    ParticipantRead,
    ParticipantEngagementSeries,
)
from app.services import MeetingService
from app.services.engagement_service import EngagementService


def _to_meeting_read(meeting: Meeting) -> MeetingRead:
    return MeetingRead(
        id=meeting.id,
        start_ts=meeting.start_ts,
        end_ts=meeting.end_ts,
    )


def _to_meeting_with_participants(meeting: Meeting) -> MeetingWithParticipants:
    participants = []
    for participant in meeting.participants:
        samples = [
            EngagementSampleRead(bucket=s.bucket, status=s.status)
            for s in sorted(participant.engagement_samples, key=lambda s: s.bucket)
        ]
        participants.append(
            ParticipantRead(
                id=participant.id,
                meeting_id=participant.meeting_id,
                expires_at=participant.expires_at,
                last_status=participant.last_status,
                engagement_samples=samples,
            )
        )
    return MeetingWithParticipants(
        id=meeting.id,
        start_ts=meeting.start_ts,
        end_ts=meeting.end_ts,
        participants=participants,
    )


class MeetingsController(Controller):
    path = "/meetings"
    dependencies = {}

    @get("/", sync_to_thread=False)
    def list_meetings(
        self,
        meeting_service: MeetingService,
        pagination: PaginationParams | None = None,
    ) -> PaginatedMeetings:
        pagination = pagination or PaginationParams()
        items, total = meeting_service.list_meetings(page=pagination.page, page_size=pagination.page_size)
        return PaginatedMeetings(
            items=[_to_meeting_read(m) for m in items],
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
        )

    @post("/", sync_to_thread=False)
    def create_meeting(self, meeting_service: MeetingService) -> MeetingRead:
        meeting = meeting_service.ensure_meeting_for_visit(datetime.now())
        return _to_meeting_read(meeting)

    @get("/{meeting_id:str}", sync_to_thread=False)
    def get_meeting(
        self, meeting_id: str, meeting_service: MeetingService
    ) -> MeetingWithParticipants:
        meeting = meeting_service.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        # Load engagement samples for participants
        # We rely on relationships defined on models.
        return _to_meeting_with_participants(meeting)

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

        summary = engagement_service.build_engagement_summary(meeting)

        return EngagementSummary(
            meeting_id=summary["meeting_id"],
            start=summary["start"],
            end=summary["end"],
            bucket_minutes=summary["bucket_minutes"],
            window_minutes=summary["window_minutes"],
            overall=[EngagementPoint(**point) for point in summary["overall"]],
            participants=[ParticipantEngagementSeries(**participant) for participant in summary["participants"]],
        )

    @patch("/{meeting_id:str}/duration", sync_to_thread=False)
    def update_duration(
        self,
        meeting_id: str,
        data: MeetingDurationUpdate,
        meeting_service: MeetingService,
    ) -> MeetingRead:
        try:
            meeting = meeting_service.update_duration(meeting_id=meeting_id, duration_minutes=data.duration_minutes)
        except ValueError as exc:
            message = str(exc)
            status = 404 if "not found" in message.lower() else 400
            raise HTTPException(status_code=status, detail=message)

        return _to_meeting_read(meeting)

from datetime import datetime
from typing import Literal, Optional

from litestar import Controller, post
from litestar.exceptions import HTTPException
from pydantic import BaseModel, Field

from app.models import Participant
from app.schema import EngagementSampleRead, ParticipantRead
from app.services import EngagementService, MeetingService, ParticipantService
from app.ws import ws_manager

StatusLiteral = Literal["speaking", "engaged", "not_engaged"]


class StatusChangeRequest(BaseModel):
    meeting_id: str = Field(..., description="Target meeting id")
    participant_id: Optional[str] = Field(None, description="Existing participant id, if any")
    status: StatusLiteral = Field(..., description="Participant status")


def _participant_to_schema(participant: Participant) -> ParticipantRead:
    samples = [
        EngagementSampleRead(bucket=s.bucket, status=s.status)
        for s in sorted(participant.engagement_samples, key=lambda s: s.bucket)
    ]
    return ParticipantRead(
        id=participant.id,
        meeting_id=participant.meeting_id,
        expires_at=participant.expires_at,
        last_status=participant.last_status,
        engagement_samples=samples,
    )


def _build_delta_message(
    meeting_id: str, participant_id: str, bucket: datetime, status: StatusLiteral, rollup: dict
) -> dict:
    return {
        "type": "delta",
        "data": {
            "meeting_id": meeting_id,
            "participant_id": participant_id,
            "bucket": bucket.isoformat(),
            "status": status,
            "overall": rollup["overall"],
            "participants": rollup["participants"],
        },
    }


class UsersController(Controller):
    path = "/users"

    @post("/status", sync_to_thread=False)
    def change_status(
        self,
        data: StatusChangeRequest,
        meeting_service: MeetingService,
        participant_service: ParticipantService,
        engagement_service: EngagementService,
    ) -> ParticipantRead:
        meeting = meeting_service.get_meeting(data.meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        now = datetime.now()
        # Status changes may not carry fingerprint; rely on participant_id when provided.
        participant = participant_service.get_or_create_active(
            meeting=meeting, now=now, device_fingerprint="", participant_id=data.participant_id
        )
        bucket = engagement_service.record_status(participant=participant, status=data.status, current_time=now)

        rollup = engagement_service.bucket_rollup(meeting=meeting, bucket=bucket)
        # Fire and forget; if no listeners, nothing happens.
        ws_manager.broadcast_sync(
            meeting_id=meeting.id,
            message=_build_delta_message(
                meeting_id=meeting.id,
                participant_id=participant.id,
                bucket=bucket,
                status=data.status,
                rollup=rollup,
            ),
        )

        refreshed = participant_service.participant_repo.get_with_engagement(participant.id)
        if not refreshed:
            raise HTTPException(status_code=500, detail="Unable to load participant")
        return _participant_to_schema(refreshed)


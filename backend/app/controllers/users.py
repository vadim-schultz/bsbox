import json
from datetime import UTC, datetime

from litestar import Controller, post
from litestar.channels import ChannelsPlugin
from litestar.exceptions import HTTPException

from app.schema import (
    DeltaMessage,
    DeltaMessageData,
    ParticipantRead,
    StatusChangeRequest,
)
from app.services import EngagementService, MeetingService, ParticipantService


class UsersController(Controller):
    path = "/users"

    @post("/status", sync_to_thread=False)
    def change_status(
        self,
        data: StatusChangeRequest,
        meeting_service: MeetingService,
        participant_service: ParticipantService,
        engagement_service: EngagementService,
        channels: ChannelsPlugin,
    ) -> ParticipantRead:
        try:
            meeting = meeting_service.get_meeting(data.meeting_id)
            if not meeting:
                raise HTTPException(status_code=404, detail="Meeting not found")

            now = datetime.now(tz=UTC)
            # Status changes may not carry fingerprint; rely on participant_id when provided.
            participant = participant_service.get_or_create_active(
                meeting=meeting, now=now, device_fingerprint="", participant_id=data.participant_id
            )
            bucket = engagement_service.record_status(
                participant=participant, status=data.status, current_time=now
            )

            rollup = engagement_service.bucket_rollup(meeting=meeting, bucket=bucket)
            # Fire and forget; if no listeners, nothing happens.
            delta_message = DeltaMessage(
                data=DeltaMessageData(
                    meeting_id=meeting.id,
                    participant_id=participant.id,
                    bucket=bucket,
                    status=data.status,
                    overall=rollup["overall"],
                    participants=rollup["participants"],
                )
            )
            # Publish to the meeting channel - Channels expects bytes or str
            channels.publish(
                data=json.dumps(delta_message.model_dump(mode="json")),
                channels=[f"meeting:{meeting.id}"],
            )

            refreshed = participant_service.participant_repo.get_with_engagement(participant.id)
            if not refreshed:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unable to load participant {participant.id} for meeting {meeting.id}",
                )
            return refreshed.to_read_schema()
        except Exception:
            import traceback

            traceback.print_exc()
            raise

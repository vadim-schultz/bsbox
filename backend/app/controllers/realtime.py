import logging

from litestar import websocket
from litestar.connection import WebSocket
from litestar.exceptions import WebSocketDisconnect

from app.ws import ws_manager

logger = logging.getLogger(__name__)


def _serialize_summary(summary: dict) -> dict:
    return {
        "meeting_id": summary["meeting_id"],
        "start": summary["start"].isoformat(),
        "end": summary["end"].isoformat(),
        "bucket_minutes": summary["bucket_minutes"],
        "window_minutes": summary["window_minutes"],
        "overall": [
            {"bucket": point["bucket"].isoformat(), "value": point["value"]}
            for point in summary["overall"]
        ],
        "participants": [
            {
                "participant_id": participant["participant_id"],
                "device_fingerprint": participant["device_fingerprint"],
                "series": [
                    {"bucket": point["bucket"].isoformat(), "value": point["value"]}
                    for point in participant["series"]
                ],
            }
            for participant in summary["participants"]
        ],
    }


@websocket("/ws/meetings/{meeting_id:str}")
async def meeting_stream(
    socket: WebSocket,
    meeting_id: str,
) -> None:
    logger.info("WS connection attempt meeting_id=%s", meeting_id)
    await socket.accept()
    logger.info("WS accepted meeting_id=%s", meeting_id)

    # Import here to avoid circular import and test without DI
    from app.db import SessionLocal
    from app.repos import EngagementRepo, MeetingRepo, ParticipantRepo
    from app.services import EngagementService as EngSvc
    from app.services import MeetingService as MeetSvc

    session = SessionLocal()
    try:
        meeting_service = MeetSvc(MeetingRepo(session))
        engagement_service = EngSvc(EngagementRepo(session), ParticipantRepo(session))

        meeting = meeting_service.get_meeting(meeting_id)
        if not meeting:
            logger.warning("WS meeting not found meeting_id=%s", meeting_id)
            await socket.close(code=4404, reason="Meeting not found")
            return

        ws_manager.register(meeting_id, socket)

        # Initial snapshot
        summary = engagement_service.build_engagement_summary(meeting)
        await socket.send_json({"type": "snapshot", "data": _serialize_summary(summary)})

        try:
            # Keep the connection alive; respond to simple ping messages
            while True:
                message = await socket.receive_text()
                if message == "ping":
                    await socket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("WS error meeting_id=%s", meeting_id)
        finally:
            logger.info("WS disconnect meeting_id=%s", meeting_id)
            ws_manager.unregister(meeting_id, socket)
    finally:
        session.close()

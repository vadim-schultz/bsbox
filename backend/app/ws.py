import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Set

from litestar.connection import WebSocket

logger = logging.getLogger(__name__)


class MeetingConnectionManager:
    """Manage websocket connections per meeting and broadcast safely."""

    def __init__(self) -> None:
        self.connections: DefaultDict[str, Set[WebSocket]] = defaultdict(set)

    @property
    def connection_count(self) -> int:
        return sum(len(sockets) for sockets in self.connections.values())

    def register(self, meeting_id: str, socket: WebSocket) -> None:
        self.connections[meeting_id].add(socket)
        logger.debug(
            "WS registered meeting_id=%s (total=%d, meetings=%d)",
            meeting_id,
            len(self.connections[meeting_id]),
            len(self.connections),
        )

    def unregister(self, meeting_id: str, socket: WebSocket) -> None:
        if meeting_id in self.connections:
            self.connections[meeting_id].discard(socket)
            if not self.connections[meeting_id]:
                self.connections.pop(meeting_id, None)
        logger.debug(
            "WS unregistered meeting_id=%s (total_connections=%d)",
            meeting_id,
            self.connection_count,
        )

    async def _send(self, meeting_id: str, socket: WebSocket, message: dict) -> bool:
        try:
            await socket.send_json(message)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("WS send failed meeting_id=%s: %s", meeting_id, exc)
            return False

    async def broadcast(self, meeting_id: str, message: dict) -> None:
        sockets = list(self.connections.get(meeting_id, set()))
        if not sockets:
            return

        results = await asyncio.gather(
            *(self._send(meeting_id, socket, message) for socket in sockets),
            return_exceptions=False,
        )
        for socket, ok in zip(sockets, results, strict=False):
            if not ok:
                self.unregister(meeting_id, socket)

    def broadcast_sync(self, meeting_id: str, message: dict) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(meeting_id, message))
        except RuntimeError:
            # No running loop; ignore broadcast
            logger.debug("WS broadcast skipped (no running loop)")


ws_manager = MeetingConnectionManager()


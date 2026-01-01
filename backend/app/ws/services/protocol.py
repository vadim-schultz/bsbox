"""WebSocket service protocol definition."""

from typing import Protocol

from pydantic import BaseModel

from app.schema.websocket import WSRequestBase
from app.ws.transport.context import WSContext


class WSService(Protocol):
    """Protocol for WebSocket message services.

    All services must implement the execute method which processes
    validated requests and returns a response.
    """

    async def execute(self, request: WSRequestBase, context: WSContext) -> BaseModel | None:
        """Execute validated request and return a Pydantic response model.

        Args:
            request: Validated request model (already passed validation)
            context: WebSocket connection context with session, meeting, etc.

        Returns:
            Pydantic response model to send back, or None for no direct response
        """
        ...

"""Message routing for WebSocket connections.

This module handles parsing, validation, and routing of incoming WebSocket
messages to appropriate service handlers using discriminated unions.
"""

import logging
from typing import Any

from pydantic import BaseModel, TypeAdapter, ValidationError

from app.schema.websocket import ErrorResponse, JoinRequest, PingRequest, StatusUpdateRequest
from app.ws.shared.factory import WSServiceFactory
from app.ws.transport.context import WSContext

logger = logging.getLogger(__name__)

# Create TypeAdapter for the discriminated union
ws_request_adapter: TypeAdapter[JoinRequest | StatusUpdateRequest | PingRequest] = TypeAdapter(
    JoinRequest | StatusUpdateRequest | PingRequest
)


class MessageRouter:
    """Routes WebSocket messages to appropriate services using discriminated unions.

    Handles the complete flow from raw message to service execution:
    1. Parse and validate message structure
    2. Validate meeting state
    3. Validate participant state
    4. Route to appropriate service
    """

    async def route_message(
        self,
        message: dict[str, Any],
        context: WSContext,
        factory: WSServiceFactory,
    ) -> BaseModel | None:
        """Route WebSocket message to appropriate service.

        Args:
            message: Raw message dictionary from client
            context: WebSocket connection context
            factory: Service factory for getting appropriate service

        Returns:
            Pydantic response model, or None if no direct response needed
        """
        try:
            # 1. Parse & validate structure (discriminated union auto-routes)
            request = ws_request_adapter.validate_python(message)

            # 2. Validate meeting state
            if error := request.validate_meeting(context):
                return error

            # 3. Validate participant state
            if error := request.validate_participant(context):
                return error

            # 4. Get service and execute
            service = factory.get_service(request.type)
            if not service:
                return ErrorResponse(message=f"Unknown message type: {request.type}")

            return await service.execute(request, context)

        except ValidationError as e:
            logger.warning("Invalid request: %s", e)
            return ErrorResponse(message=f"Invalid request: {e.errors()[0]['msg']}")
        except Exception as e:
            logger.exception("Error routing WebSocket message: %s", e)
            return ErrorResponse(message="Internal error")

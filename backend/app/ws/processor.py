"""WebSocket message processor using discriminated unions."""

import logging
from typing import Any

from pydantic import BaseModel, TypeAdapter, ValidationError

from app.schema.websocket import ErrorResponse, JoinRequest, PingRequest, StatusUpdateRequest
from app.ws.context import WSContext
from app.ws.factory import WSMessageHandlerFactory

logger = logging.getLogger(__name__)

# Create TypeAdapter for the discriminated union
ws_request_adapter: TypeAdapter[JoinRequest | StatusUpdateRequest | PingRequest] = TypeAdapter(
    JoinRequest | StatusUpdateRequest | PingRequest
)


async def process_ws_message(
    message: dict[str, Any],
    context: WSContext,
    factory: WSMessageHandlerFactory,
) -> BaseModel | None:
    """Process WebSocket message using discriminated union routing.

    Args:
        message: Raw message dictionary from client
        context: WebSocket connection context
        factory: Handler factory for getting appropriate executor

    Returns:
        Pydantic response model

    The flow:
    1. Parse & validate structure (discriminated union auto-routes to correct type)
    2. Validate meeting state
    3. Validate participant state
    4. Get handler and execute
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

        # 4. Get handler and execute
        handler = factory.get_handler(request.type)
        if not handler:
            return ErrorResponse(message=f"Unknown message type: {request.type}")

        return await handler.execute(request, context)

    except ValidationError as e:
        logger.warning("Invalid request: %s", e)
        return ErrorResponse(message=f"Invalid request: {e.errors()[0]['msg']}")
    except Exception as e:
        logger.exception("Error processing WebSocket message: %s", e)
        return ErrorResponse(message="Internal error")

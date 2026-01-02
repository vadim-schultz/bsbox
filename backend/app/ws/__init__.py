"""WebSocket module for real-time meeting engagement tracking.

Organized using controller/service/repo pattern:
- controllers/: Connection lifecycle and message routing
- services/: Business logic for message handling
- repos/: Low-level channel operations (broadcast, subscribe)
- transport/: WebSocket plumbing (context, lifecycle)
- shared/: Cross-cutting utilities (factory)
- background/: Background tasks (periodic broadcaster)
"""

from app.ws.background import BroadcasterFactory
from app.ws.controllers.connection import meeting_stream_controller

__all__ = ["meeting_stream_controller", "BroadcasterFactory"]

"""Lifecycle management for WebSocket connections.

This package contains components for managing the WebSocket connection lifecycle:
- validators: Connection and timing validation
- watcher: Meeting end detection and connection closure
- coordinator: Overall lifecycle orchestration
"""

from app.ws.transport.lifecycle.coordinator import LifecycleCoordinator, LifecycleResult
from app.ws.transport.lifecycle.validators import (
    ConnectionValidator,
    MeetingTimingCheck,
    MeetingTimingValidator,
)
from app.ws.transport.lifecycle.watcher import MeetingEndWatcher

__all__ = [
    "LifecycleCoordinator",
    "LifecycleResult",
    "ConnectionValidator",
    "MeetingTimingCheck",
    "MeetingTimingValidator",
    "MeetingEndWatcher",
]

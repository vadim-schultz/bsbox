"""Schema package - Pydantic models for API requests, responses, and WebSocket protocol.

This package is organized by domain:
- common: Shared utilities and base classes
- meeting: Core meeting entity schemas
- participant: Participant-related schemas
- engagement: Engagement tracking and analytics
- location: Physical location schemas (city, room)
- integration: Third-party integrations (MS Teams, etc.)
- visit: Meeting discovery flow
- websocket: Real-time WebSocket protocol

Import schemas from their specific domain modules:
    from app.schema.meeting.models import MeetingRead
    from app.schema.participant.requests import ParticipantCreate
    from app.schema.websocket.requests import JoinRequest
"""

__all__ = [
    "common",
    "meeting",
    "participant",
    "engagement",
    "location",
    "integration",
    "visit",
    "websocket",
]

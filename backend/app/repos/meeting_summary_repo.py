"""Repository for meeting summary operations."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from app.models.meeting_summary import MeetingSummary


class MeetingSummaryRepo:
    """Repository for managing meeting summaries."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, meeting_id: str) -> MeetingSummary | None:
        """Get summary for a meeting.

        Args:
            meeting_id: The meeting ID

        Returns:
            MeetingSummary if exists, None otherwise
        """
        stmt = select(MeetingSummary).where(MeetingSummary.meeting_id == meeting_id)
        return self.session.scalars(stmt).first()

    def create(
        self,
        meeting_id: str,
        max_participants: int,
        normalized_engagement: float,
        engagement_level: str,
    ) -> MeetingSummary:
        """Create or update meeting summary (upsert).

        Args:
            meeting_id: The meeting ID
            max_participants: Maximum number of participants
            normalized_engagement: Normalized engagement score
            engagement_level: Engagement level classification

        Returns:
            The created/updated MeetingSummary
        """
        computed_at = datetime.now(tz=UTC)

        stmt = insert(MeetingSummary).values(
            meeting_id=meeting_id,
            max_participants=max_participants,
            normalized_engagement=normalized_engagement,
            engagement_level=engagement_level,
            computed_at=computed_at,
        )

        # On conflict, update all fields except meeting_id
        stmt = stmt.on_conflict_do_update(
            index_elements=["meeting_id"],
            set_={
                "max_participants": stmt.excluded.max_participants,
                "normalized_engagement": stmt.excluded.normalized_engagement,
                "engagement_level": stmt.excluded.engagement_level,
                "computed_at": stmt.excluded.computed_at,
            },
        )

        self.session.execute(stmt)
        self.session.flush()

        # Return the created/updated record
        return self.get(meeting_id)  # type: ignore[return-value]

    def exists(self, meeting_id: str) -> bool:
        """Check if summary exists for meeting.

        Args:
            meeting_id: The meeting ID

        Returns:
            True if summary exists, False otherwise
        """
        return self.get(meeting_id) is not None

"""Service for computing and managing meeting summaries."""

from app.models import Meeting, MeetingSummary
from app.repos import MeetingSummaryRepo, ParticipantRepo
from app.services.engagement_service import EngagementService


class MeetingSummaryService:
    """Service for computing and managing meeting summaries.

    Orchestrates the computation of meeting statistics by coordinating:
    - Engagement metrics from EngagementService
    - Participant counts from ParticipantRepo
    - Persistence through MeetingSummaryRepo
    """

    def __init__(
        self,
        engagement_service: EngagementService,
        participant_repo: ParticipantRepo,
        meeting_summary_repo: MeetingSummaryRepo,
    ) -> None:
        """Initialize service with required dependencies.

        Args:
            engagement_service: Service for engagement computation and classification
            participant_repo: Repository for participant queries
            meeting_summary_repo: Repository for summary persistence
        """
        self.engagement_service = engagement_service
        self.participant_repo = participant_repo
        self.meeting_summary_repo = meeting_summary_repo

    def compute_summary_data(self, meeting: Meeting) -> dict[str, int | float | str]:
        """Compute summary statistics without persisting.

        Orchestrates metric gathering from different sources:
        1. Max participant count from participant repo
        2. Raw engagement from engagement service
        3. Normalized engagement via size-aware formula
        4. Engagement level classification

        Args:
            meeting: The meeting to compute summary for

        Returns:
            Dictionary with keys: max_participants, normalized_engagement, engagement_level
        """
        max_participants = self.participant_repo.get_max_participant_count(meeting.id)
        raw_engagement = self.engagement_service.compute_average_engagement(meeting)
        normalized_engagement = self.engagement_service.normalize_engagement(
            raw_engagement, max_participants
        )
        engagement_level = self.engagement_service.classify_engagement_level(normalized_engagement)

        return {
            "max_participants": max_participants,
            "normalized_engagement": normalized_engagement,
            "engagement_level": engagement_level,
        }

    def persist_summary(self, meeting: Meeting) -> MeetingSummary:
        """Persist meeting summary to database.

        Returns cached summary if already exists, otherwise computes and persists.

        Args:
            meeting: The meeting to persist summary for

        Returns:
            The persisted MeetingSummary
        """
        # Return cached if exists
        existing = self.meeting_summary_repo.get(meeting.id)
        if existing:
            return existing

        # Compute metrics
        data = self.compute_summary_data(meeting)

        # Persist
        return self.meeting_summary_repo.create(
            meeting_id=meeting.id,
            max_participants=data["max_participants"],  # type: ignore[arg-type]
            normalized_engagement=data["normalized_engagement"],  # type: ignore[arg-type]
            engagement_level=data["engagement_level"],  # type: ignore[arg-type]
        )

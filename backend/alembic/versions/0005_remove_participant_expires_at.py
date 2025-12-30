"""Remove expires_at column from participants table.

Participant expiration is now determined by the meeting end time.

Revision ID: 0005_remove_participant_expires_at
Revises: 0004_add_location_teams
Create Date: 2025-12-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_remove_participant_expires_at"
down_revision: str | None = "0004_add_location_teams"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop the expires_at column from participants
    with op.batch_alter_table("participants") as batch_op:
        batch_op.drop_column("expires_at")


def downgrade() -> None:
    # Re-add the expires_at column
    with op.batch_alter_table("participants") as batch_op:
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(), nullable=True))

    # Populate expires_at from meeting end_ts
    op.execute(
        """
        UPDATE participants
        SET expires_at = (
            SELECT meetings.end_ts
            FROM meetings
            WHERE meetings.id = participants.meeting_id
        )
        """
    )

    # Make the column non-nullable
    with op.batch_alter_table("participants") as batch_op:
        batch_op.alter_column("expires_at", nullable=False)

"""add_meeting_summaries_table

Revision ID: 17e35114e360
Revises: d0d69723b9a2
Create Date: 2026-01-03 19:15:06.816798

"""

from typing import Union
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "17e35114e360"
down_revision: str | None = "d0d69723b9a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "meeting_summaries",
        sa.Column("meeting_id", sa.String(36), nullable=False),
        sa.Column("max_participants", sa.Integer(), nullable=False),
        sa.Column("normalized_engagement", sa.Float(), nullable=False),
        sa.Column("engagement_level", sa.String(20), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
        ),
        sa.PrimaryKeyConstraint("meeting_id"),
    )


def downgrade() -> None:
    op.drop_table("meeting_summaries")

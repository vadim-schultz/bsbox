"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2025-11-08 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "participants",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("device_id", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("last_seen", sa.DateTime(timezone=False), nullable=False),
        sa.Column("signal_strength", sa.Integer(), nullable=True),
    )

    op.create_table(
        "meetings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=False), nullable=False, index=True),
        sa.Column("actual_start", sa.DateTime(timezone=False), nullable=False),
        sa.Column("actual_end", sa.DateTime(timezone=False), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False),
    )

    op.create_table(
        "meeting_participants",
        sa.Column("meeting_id", sa.String(length=36), sa.ForeignKey("meetings.id"), primary_key=True),
        sa.Column("participant_id", sa.String(length=36), sa.ForeignKey("participants.id"), primary_key=True),
    )

    op.create_table(
        "connection_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("meeting_id", sa.String(length=36), sa.ForeignKey("meetings.id"), index=True),
        sa.Column("participant_id", sa.String(length=36), sa.ForeignKey("participants.id"), index=True),
        sa.Column("timestamp", sa.DateTime(timezone=False), nullable=False, index=True),
        sa.Column("is_connected", sa.Boolean(), nullable=False),
        sa.Column("signal_strength", sa.Integer(), nullable=True),
    )

    op.create_table(
        "engagement_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("meeting_id", sa.String(length=36), sa.ForeignKey("meetings.id"), index=True),
        sa.Column("participant_id", sa.String(length=36), sa.ForeignKey("participants.id"), index=True),
        sa.Column("timestamp", sa.DateTime(timezone=False), nullable=False, index=True),
        sa.Column("is_speaking", sa.Boolean(), nullable=False, default=False),
        sa.Column("is_relevant", sa.Boolean(), nullable=False, default=False),
    )


def downgrade() -> None:
    op.drop_table("engagement_events")
    op.drop_table("connection_events")
    op.drop_table("meeting_participants")
    op.drop_table("meetings")
    op.drop_table("participants")


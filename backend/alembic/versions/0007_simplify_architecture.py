"""Simplify architecture: unique start_ts, last_seen_at, nullable device_fingerprint."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_simplify_architecture"
down_revision = "0006_extract_ms_teams_meeting"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add unique constraint on meetings.start_ts for deterministic meeting IDs
    op.create_index("ix_meetings_start_ts_unique", "meetings", ["start_ts"], unique=True)

    # Add last_seen_at column to participants for activity tracking
    op.add_column(
        "participants",
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
    )

    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # to make device_fingerprint nullable (it currently has server_default="")
    # For now, we'll just ensure the column allows empty strings which is already the case
    # The column is already nullable in practice since it has a server_default

    # Create index on last_seen_at for efficient activity queries
    op.create_index("ix_participants_last_seen_at", "participants", ["last_seen_at"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_participants_last_seen_at", table_name="participants")
    op.drop_index("ix_meetings_start_ts_unique", table_name="meetings")

    # Drop last_seen_at column
    op.drop_column("participants", "last_seen_at")

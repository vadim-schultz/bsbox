"""Initial schema"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("start_ts", sa.DateTime(), nullable=False),
        sa.Column("end_ts", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "participants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=False),
        sa.Column("device_fingerprint", sa.String(length=128), server_default=sa.text("''"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_status", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])
    op.create_index("ix_participants_device_fingerprint", "participants", ["device_fingerprint"])

    op.create_table(
        "engagement_samples",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("participant_id", sa.String(length=36), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("bucket", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("participant_id", "bucket", name="uq_sample_bucket"),
    )
    op.create_index("ix_engagement_samples_participant_id", "engagement_samples", ["participant_id"])


def downgrade() -> None:
    op.drop_index("ix_engagement_samples_participant_id", table_name="engagement_samples")
    op.drop_table("engagement_samples")

    op.drop_index("ix_participants_device_fingerprint", table_name="participants")
    op.drop_index("ix_participants_meeting_id", table_name="participants")
    op.drop_table("participants")

    op.drop_table("meetings")


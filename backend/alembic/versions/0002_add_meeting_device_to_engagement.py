"""Add meeting_id and device_fingerprint to engagement samples"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_add_meeting_device_to_engagement"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = {c["name"]: c for c in insp.get_columns("engagement_samples")}

    # Add columns if missing
    added_meeting = False
    if "meeting_id" not in columns:
        op.add_column("engagement_samples", sa.Column("meeting_id", sa.Integer(), nullable=True))
        added_meeting = True
    if "device_fingerprint" not in columns:
        op.add_column(
            "engagement_samples",
            sa.Column(
                "device_fingerprint",
                sa.String(length=128),
                server_default=sa.text("''"),
                nullable=False,
            ),
        )

    # Add indexes if missing
    existing_indexes = {ix["name"] for ix in insp.get_indexes("engagement_samples")}
    if "ix_engagement_samples_meeting_id" not in existing_indexes:
        op.create_index("ix_engagement_samples_meeting_id", "engagement_samples", ["meeting_id"])
    if "ix_engagement_samples_bucket" not in existing_indexes:
        op.create_index("ix_engagement_samples_bucket", "engagement_samples", ["bucket"])

    # Backfill only if we just added columns
    if added_meeting or "device_fingerprint" not in columns:
        conn.execute(
            sa.text(
                """
                UPDATE engagement_samples
                SET meeting_id = (
                    SELECT p.meeting_id FROM participants p WHERE p.id = engagement_samples.participant_id
                ),
                device_fingerprint = COALESCE((
                    SELECT p.device_fingerprint FROM participants p WHERE p.id = engagement_samples.participant_id
                ), '')
                """
            )
        )

    # Ensure meeting_id is non-nullable; SQLite requires a table rebuild via batch_alter_table
    refreshed = sa.inspect(conn).get_columns("engagement_samples")
    meeting_nullable = True
    for col in refreshed:
        if col["name"] == "meeting_id":
            meeting_nullable = col.get("nullable", True)
            break

    if meeting_nullable:
        with op.batch_alter_table("engagement_samples") as batch_op:
            batch_op.alter_column("meeting_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.drop_index("ix_engagement_samples_bucket", table_name="engagement_samples")
    op.drop_index("ix_engagement_samples_meeting_id", table_name="engagement_samples")
    op.drop_column("engagement_samples", "device_fingerprint")
    op.drop_column("engagement_samples", "meeting_id")

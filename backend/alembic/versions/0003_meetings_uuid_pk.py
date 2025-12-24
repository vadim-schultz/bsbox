"""Switch meetings primary key to UUID strings."""

from __future__ import annotations

from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "0003_meetings_uuid_pk"
down_revision = "0002_add_meeting_device_to_engagement"
branch_labels = None
depends_on = None


def _build_meeting_uuid_map(conn) -> dict[int, str]:
    rows = conn.execute(sa.text("SELECT id, start_ts, end_ts, created_at FROM meetings")).fetchall()
    return {row.id: str(uuid4()) for row in rows}, rows


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("PRAGMA foreign_keys=OFF"))

    meeting_uuid_map, meeting_rows = _build_meeting_uuid_map(conn)

    op.create_table(
        "meetings_new",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("start_ts", sa.DateTime(), nullable=False),
        sa.Column("end_ts", sa.DateTime(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    for row in meeting_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO meetings_new (id, start_ts, end_ts, created_at)
                VALUES (:id, :start_ts, :end_ts, :created_at)
                """
            ),
            {
                "id": meeting_uuid_map[row.id],
                "start_ts": row.start_ts,
                "end_ts": row.end_ts,
                "created_at": row.created_at,
            },
        )

    op.create_table(
        "participants_new",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "meeting_id",
            sa.String(length=36),
            sa.ForeignKey("meetings.id"),
            nullable=False,
        ),
        sa.Column(
            "device_fingerprint",
            sa.String(length=128),
            server_default=sa.text("''"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_status", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    participant_rows = conn.execute(
        sa.text(
            """
            SELECT id, meeting_id, device_fingerprint, expires_at, last_status, created_at
            FROM participants
            """
        )
    ).fetchall()
    for row in participant_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO participants_new (id, meeting_id, device_fingerprint, expires_at, last_status, created_at)
                VALUES (:id, :meeting_id, :device_fingerprint, :expires_at, :last_status, :created_at)
                """
            ),
            {
                "id": row.id,
                "meeting_id": meeting_uuid_map[row.meeting_id],
                "device_fingerprint": row.device_fingerprint,
                "expires_at": row.expires_at,
                "last_status": row.last_status,
                "created_at": row.created_at,
            },
        )

    op.create_table(
        "engagement_samples_new",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.String(length=36),
            sa.ForeignKey("meetings.id"),
            nullable=False,
        ),
        sa.Column(
            "participant_id",
            sa.String(length=36),
            sa.ForeignKey("participants.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("bucket", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "device_fingerprint",
            sa.String(length=128),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("participant_id", "bucket", name="uq_sample_bucket"),
    )

    engagement_rows = conn.execute(
        sa.text(
            """
            SELECT id, meeting_id, participant_id, bucket, status, device_fingerprint, created_at
            FROM engagement_samples
            """
        )
    ).fetchall()
    for row in engagement_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO engagement_samples_new (id, meeting_id, participant_id, bucket, status, device_fingerprint, created_at)
                VALUES (:id, :meeting_id, :participant_id, :bucket, :status, :device_fingerprint, :created_at)
                """
            ),
            {
                "id": row.id,
                "meeting_id": meeting_uuid_map[row.meeting_id],
                "participant_id": row.participant_id,
                "bucket": row.bucket,
                "status": row.status,
                "device_fingerprint": row.device_fingerprint,
                "created_at": row.created_at,
            },
        )

    op.drop_table("engagement_samples")
    op.drop_table("participants")
    op.drop_table("meetings")

    op.rename_table("meetings_new", "meetings")
    op.rename_table("participants_new", "participants")
    op.rename_table("engagement_samples_new", "engagement_samples")

    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])
    op.create_index(
        "ix_participants_device_fingerprint",
        "participants",
        ["device_fingerprint"],
    )
    op.create_index(
        "ix_engagement_samples_meeting_id",
        "engagement_samples",
        ["meeting_id"],
    )
    op.create_index("ix_engagement_samples_bucket", "engagement_samples", ["bucket"])
    op.create_index(
        "ix_engagement_samples_participant_id",
        "engagement_samples",
        ["participant_id"],
    )

    conn.execute(sa.text("PRAGMA foreign_keys=ON"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("PRAGMA foreign_keys=OFF"))

    meeting_rows = conn.execute(
        sa.text("SELECT id, start_ts, end_ts, created_at FROM meetings ORDER BY created_at, id")
    ).fetchall()
    meeting_int_map = {row.id: idx for idx, row in enumerate(meeting_rows, start=1)}

    op.create_table(
        "meetings_old",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("start_ts", sa.DateTime(), nullable=False),
        sa.Column("end_ts", sa.DateTime(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    for row in meeting_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO meetings_old (id, start_ts, end_ts, created_at)
                VALUES (:id, :start_ts, :end_ts, :created_at)
                """
            ),
            {
                "id": meeting_int_map[row.id],
                "start_ts": row.start_ts,
                "end_ts": row.end_ts,
                "created_at": row.created_at,
            },
        )

    op.create_table(
        "participants_old",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id"),
            nullable=False,
        ),
        sa.Column(
            "device_fingerprint",
            sa.String(length=128),
            server_default=sa.text("''"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_status", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    participant_rows = conn.execute(
        sa.text(
            """
            SELECT id, meeting_id, device_fingerprint, expires_at, last_status, created_at
            FROM participants
            """
        )
    ).fetchall()
    for row in participant_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO participants_old (id, meeting_id, device_fingerprint, expires_at, last_status, created_at)
                VALUES (:id, :meeting_id, :device_fingerprint, :expires_at, :last_status, :created_at)
                """
            ),
            {
                "id": row.id,
                "meeting_id": meeting_int_map[row.meeting_id],
                "device_fingerprint": row.device_fingerprint,
                "expires_at": row.expires_at,
                "last_status": row.last_status,
                "created_at": row.created_at,
            },
        )

    op.create_table(
        "engagement_samples_old",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id"),
            nullable=False,
        ),
        sa.Column(
            "participant_id",
            sa.String(length=36),
            sa.ForeignKey("participants.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("bucket", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "device_fingerprint",
            sa.String(length=128),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("participant_id", "bucket", name="uq_sample_bucket"),
    )

    engagement_rows = conn.execute(
        sa.text(
            """
            SELECT id, meeting_id, participant_id, bucket, status, device_fingerprint, created_at
            FROM engagement_samples
            """
        )
    ).fetchall()
    for row in engagement_rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO engagement_samples_old (id, meeting_id, participant_id, bucket, status, device_fingerprint, created_at)
                VALUES (:id, :meeting_id, :participant_id, :bucket, :status, :device_fingerprint, :created_at)
                """
            ),
            {
                "id": row.id,
                "meeting_id": meeting_int_map[row.meeting_id],
                "participant_id": row.participant_id,
                "bucket": row.bucket,
                "status": row.status,
                "device_fingerprint": row.device_fingerprint,
                "created_at": row.created_at,
            },
        )

    op.drop_table("engagement_samples")
    op.drop_table("participants")
    op.drop_table("meetings")

    op.rename_table("meetings_old", "meetings")
    op.rename_table("participants_old", "participants")
    op.rename_table("engagement_samples_old", "engagement_samples")

    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])
    op.create_index(
        "ix_participants_device_fingerprint",
        "participants",
        ["device_fingerprint"],
    )
    op.create_index(
        "ix_engagement_samples_meeting_id",
        "engagement_samples",
        ["meeting_id"],
    )
    op.create_index("ix_engagement_samples_bucket", "engagement_samples", ["bucket"])
    op.create_index(
        "ix_engagement_samples_participant_id",
        "engagement_samples",
        ["participant_id"],
    )

    conn.execute(sa.text("PRAGMA foreign_keys=ON"))

"""Add city/meeting_room tables and Teams fields to meetings."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_add_location_teams"
down_revision = "0003_meetings_uuid_pk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # In SQLite, a failed prior attempt may leave tables behind because DDL is non-transactional.
    # Ensure a clean slate if rerun.
    op.execute("DROP TABLE IF EXISTS meeting_rooms")
    op.execute("DROP TABLE IF EXISTS cities")

    op.create_table(
        "cities",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    op.create_table(
        "meeting_rooms",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("city_id", sa.String(length=36), sa.ForeignKey("cities.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("name", "city_id", name="uq_meeting_room_city"),
    )
    op.create_index("ix_meeting_rooms_city_id", "meeting_rooms", ["city_id"])

    # Recreate meetings table with new columns to satisfy SQLite limitations
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
        sa.Column("city_id", sa.String(length=36), sa.ForeignKey("cities.id"), nullable=True),
        sa.Column(
            "meeting_room_id",
            sa.String(length=36),
            sa.ForeignKey("meeting_rooms.id"),
            nullable=True,
        ),
        sa.Column("ms_teams_thread_id", sa.String(length=256), nullable=True),
        sa.Column("ms_teams_meeting_id", sa.String(length=64), nullable=True),
        sa.Column("ms_teams_invite_url", sa.String(length=512), nullable=True),
    )

    op.execute(
        """
        INSERT INTO meetings_new (id, start_ts, end_ts, created_at)
        SELECT id, start_ts, end_ts, created_at FROM meetings
        """
    )

    op.drop_table("meetings")
    op.rename_table("meetings_new", "meetings")

    op.create_index("ix_meetings_city_id", "meetings", ["city_id"])
    op.create_index("ix_meetings_meeting_room_id", "meetings", ["meeting_room_id"])


def downgrade() -> None:
    # Downgrade recreate meetings without new columns
    op.create_table(
        "meetings_old",
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

    op.execute(
        """
        INSERT INTO meetings_old (id, start_ts, end_ts, created_at)
        SELECT id, start_ts, end_ts, created_at FROM meetings
        """
    )

    op.drop_index("ix_meetings_meeting_room_id", table_name="meetings")
    op.drop_index("ix_meetings_city_id", table_name="meetings")
    op.drop_table("meetings")
    op.rename_table("meetings_old", "meetings")

    op.drop_index("ix_meeting_rooms_city_id", table_name="meeting_rooms")
    op.drop_table("meeting_rooms")
    op.drop_table("cities")

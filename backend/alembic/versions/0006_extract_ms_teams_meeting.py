"""Extract MS Teams meeting data into separate table."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_extract_ms_teams_meeting"
down_revision = "0005_remove_participant_expires_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ms_teams_meetings table
    op.create_table(
        "ms_teams_meetings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("thread_id", sa.String(length=256), nullable=True),
        sa.Column("meeting_id", sa.String(length=64), nullable=True),
        sa.Column("invite_url", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    # SQLite requires table recreation to add FK and remove columns
    # Create new meetings table with proper structure
    op.create_table(
        "meetings_new",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("start_ts", sa.DateTime(), nullable=False),
        sa.Column("end_ts", sa.DateTime(), nullable=False),
        sa.Column("city_id", sa.String(length=36), sa.ForeignKey("cities.id"), nullable=True),
        sa.Column(
            "meeting_room_id",
            sa.String(length=36),
            sa.ForeignKey("meeting_rooms.id"),
            nullable=True,
        ),
        sa.Column(
            "ms_teams_meeting_id",
            sa.String(length=36),
            sa.ForeignKey("ms_teams_meetings.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    # Migrate existing data: first insert ms_teams_meetings records for meetings with Teams data
    op.execute(
        """
        INSERT INTO ms_teams_meetings (id, thread_id, meeting_id, invite_url)
        SELECT id, ms_teams_thread_id, ms_teams_meeting_id, ms_teams_invite_url
        FROM meetings
        WHERE ms_teams_thread_id IS NOT NULL
           OR ms_teams_meeting_id IS NOT NULL
           OR ms_teams_invite_url IS NOT NULL
        """
    )

    # Copy meetings data, linking to ms_teams_meetings where applicable
    op.execute(
        """
        INSERT INTO meetings_new (id, start_ts, end_ts, city_id, meeting_room_id, ms_teams_meeting_id, created_at)
        SELECT
            m.id,
            m.start_ts,
            m.end_ts,
            m.city_id,
            m.meeting_room_id,
            CASE
                WHEN m.ms_teams_thread_id IS NOT NULL
                  OR m.ms_teams_meeting_id IS NOT NULL
                  OR m.ms_teams_invite_url IS NOT NULL
                THEN m.id
                ELSE NULL
            END,
            m.created_at
        FROM meetings m
        """
    )

    # Drop old table and rename new one
    op.drop_table("meetings")
    op.rename_table("meetings_new", "meetings")

    # Recreate indexes
    op.create_index("ix_meetings_city_id", "meetings", ["city_id"])
    op.create_index("ix_meetings_meeting_room_id", "meetings", ["meeting_room_id"])
    op.create_index("ix_meetings_ms_teams_meeting_id", "meetings", ["ms_teams_meeting_id"])


def downgrade() -> None:
    # Recreate meetings table with old structure
    op.create_table(
        "meetings_old",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("start_ts", sa.DateTime(), nullable=False),
        sa.Column("end_ts", sa.DateTime(), nullable=False),
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
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    # Migrate data back, joining with ms_teams_meetings to get the original values
    op.execute(
        """
        INSERT INTO meetings_old (id, start_ts, end_ts, city_id, meeting_room_id,
                                  ms_teams_thread_id, ms_teams_meeting_id, ms_teams_invite_url, created_at)
        SELECT
            m.id,
            m.start_ts,
            m.end_ts,
            m.city_id,
            m.meeting_room_id,
            t.thread_id,
            t.meeting_id,
            t.invite_url,
            m.created_at
        FROM meetings m
        LEFT JOIN ms_teams_meetings t ON m.ms_teams_meeting_id = t.id
        """
    )

    # Drop indexes, current meetings table, and rename old back
    op.drop_index("ix_meetings_ms_teams_meeting_id", table_name="meetings")
    op.drop_index("ix_meetings_meeting_room_id", table_name="meetings")
    op.drop_index("ix_meetings_city_id", table_name="meetings")
    op.drop_table("meetings")
    op.rename_table("meetings_old", "meetings")

    # Recreate original indexes
    op.create_index("ix_meetings_city_id", "meetings", ["city_id"])
    op.create_index("ix_meetings_meeting_room_id", "meetings", ["meeting_room_id"])

    # Drop ms_teams_meetings table
    op.drop_table("ms_teams_meetings")

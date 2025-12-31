"""Convert timestamp columns to timezone-aware UTC."""

from typing import Union
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "6d7f0b908c2e"
down_revision: str | None = "49397b303f7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _alter_column_to_timestamptz(
    table: str, column: str, *, nullable: bool, has_default: bool
) -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name
    tz_type = sa.DateTime(timezone=True)

    if dialect == "postgresql":
        # Treat existing naive values as UTC, then enforce timestamptz
        op.execute(
            sa.text(
                f"ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMP WITH TIME ZONE "
                f"USING {column} AT TIME ZONE 'UTC'"
            )
        )
        if has_default:
            op.execute(
                sa.text(
                    f"ALTER TABLE {table} ALTER COLUMN {column} "
                    f"SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')"
                )
            )
    else:
        # SQLite and others: batch_alter handles table recreation if needed
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                existing_type=sa.DateTime(),
                type_=tz_type,
                existing_nullable=nullable,
                nullable=nullable,
                server_default=sa.text("CURRENT_TIMESTAMP") if has_default else None,
            )


def _alter_column_to_timestamp(
    table: str, column: str, *, nullable: bool, has_default: bool
) -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name
    naive_type = sa.DateTime(timezone=False)

    if dialect == "postgresql":
        op.execute(
            sa.text(
                f"ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE "
                f"USING {column} AT TIME ZONE 'UTC'"
            )
        )
        if has_default:
            op.execute(
                sa.text(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT CURRENT_TIMESTAMP")
            )
    else:
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                existing_type=sa.DateTime(timezone=True),
                type_=naive_type,
                existing_nullable=nullable,
                nullable=nullable,
                server_default=sa.text("CURRENT_TIMESTAMP") if has_default else None,
            )


_COLUMNS: list[tuple[str, str, bool, bool]] = [
    ("cities", "created_at", False, True),
    ("meeting_rooms", "created_at", False, True),
    ("ms_teams_meetings", "created_at", False, True),
    ("meetings", "start_ts", False, False),
    ("meetings", "end_ts", False, False),
    ("meetings", "created_at", False, True),
    ("participants", "last_seen_at", True, False),
    ("participants", "created_at", False, True),
    ("engagement_samples", "bucket", False, False),
    ("engagement_samples", "created_at", False, True),
]


def upgrade() -> None:
    for table, column, nullable, has_default in _COLUMNS:
        _alter_column_to_timestamptz(
            table,
            column,
            nullable=nullable,
            has_default=has_default,
        )


def downgrade() -> None:
    for table, column, nullable, has_default in _COLUMNS:
        _alter_column_to_timestamp(
            table,
            column,
            nullable=nullable,
            has_default=has_default,
        )

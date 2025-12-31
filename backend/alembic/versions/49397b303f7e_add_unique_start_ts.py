"""add_unique_start_ts

Revision ID: 49397b303f7e
Revises: 173e0e19449b
Create Date: 2025-12-31 05:51:29.791192

"""

from typing import Union
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "49397b303f7e"
down_revision: str | None = "173e0e19449b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_meetings_start_ts_unique", "meetings", ["start_ts"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_meetings_start_ts_unique", table_name="meetings")

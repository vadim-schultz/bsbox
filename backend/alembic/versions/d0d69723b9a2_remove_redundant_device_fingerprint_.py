"""remove_redundant_device_fingerprint_from_engagement_samples

Revision ID: d0d69723b9a2
Revises: 6d7f0b908c2e
Create Date: 2026-01-01 16:30:00.017793

"""

from typing import Union
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d0d69723b9a2"
down_revision: str | None = "6d7f0b908c2e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove redundant device_fingerprint column from engagement_samples table.

    The device_fingerprint is already stored in the participants table and can be
    accessed via the participant relationship. This column was never populated and
    represents denormalized data that was never used.
    """
    op.drop_column("engagement_samples", "device_fingerprint")


def downgrade() -> None:
    """Restore device_fingerprint column to engagement_samples table."""
    op.add_column(
        "engagement_samples",
        sa.Column("device_fingerprint", sa.String(length=128), server_default="", nullable=False),
    )

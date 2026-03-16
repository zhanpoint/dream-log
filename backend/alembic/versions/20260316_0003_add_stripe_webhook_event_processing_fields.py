"""add stripe webhook event processing fields

Revision ID: 20260316_0003
Revises: 20260316_0002
Create Date: 2026-03-16 00:03:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260316_0003"
down_revision: str | None = "20260316_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.add_column(
        "stripe_webhook_events",
        sa.Column("processing_status", sa.String(length=20), nullable=False, server_default="received"),
    )
    op.add_column(
        "stripe_webhook_events",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "stripe_webhook_events",
        sa.Column("last_error", sa.Text(), nullable=True),
    )
    op.add_column(
        "stripe_webhook_events",
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("stripe_webhook_events", "processing_status", server_default=None)
    op.alter_column("stripe_webhook_events", "attempts", server_default=None)


def downgrade() -> None:
    """降级数据库"""
    op.drop_column("stripe_webhook_events", "last_attempt_at")
    op.drop_column("stripe_webhook_events", "last_error")
    op.drop_column("stripe_webhook_events", "attempts")
    op.drop_column("stripe_webhook_events", "processing_status")


"""add stripe webhook events

Revision ID: 20260316_0001
Revises: 20260315_1700
Create Date: 2026-03-16 00:01:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260316_0001"
down_revision: str | None = "20260315_1700"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("livemode", sa.Boolean(), nullable=False),
        sa.Column("created", sa.Integer(), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )


def downgrade() -> None:
    """降级数据库"""
    op.drop_table("stripe_webhook_events")


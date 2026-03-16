"""add subscription pending update fields

Revision ID: 20260316_0002
Revises: 20260316_0001
Create Date: 2026-03-16 00:02:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260316_0002"
down_revision: str | None = "20260316_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.add_column(
        "user_subscriptions",
        sa.Column("pending_stripe_price_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("pending_plan_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("pending_effective_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """降级数据库"""
    op.drop_column("user_subscriptions", "pending_effective_at")
    op.drop_column("user_subscriptions", "pending_plan_type")
    op.drop_column("user_subscriptions", "pending_stripe_price_id")


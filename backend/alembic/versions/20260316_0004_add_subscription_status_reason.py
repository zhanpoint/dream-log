"""add subscription status reason

Revision ID: 20260316_0004
Revises: 20260316_0003
Create Date: 2026-03-16 00:04:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260316_0004"
down_revision: str | None = "20260316_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.add_column(
        "user_subscriptions",
        sa.Column("status_reason", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    """降级数据库"""
    op.drop_column("user_subscriptions", "status_reason")


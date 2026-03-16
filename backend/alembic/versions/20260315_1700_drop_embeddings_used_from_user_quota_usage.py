"""drop embeddings_used from user_quota_usage

Revision ID: 20260315_1700
Revises: 123e19d8755e
Create Date: 2026-03-15 17:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260315_1700"
down_revision: str | None = "123e19d8755e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.drop_column("user_quota_usage", "embeddings_used")


def downgrade() -> None:
    """降级数据库"""
    op.add_column(
        "user_quota_usage",
        sa.Column("embeddings_used", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("user_quota_usage", "embeddings_used", server_default=None)

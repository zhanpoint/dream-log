"""add wechat oauth fields

Revision ID: 20260501_0001
Revises: 20260401_0001
Create Date: 2026-05-01 00:01:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260501_0001"
down_revision: str | None = "20260401_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.execute("ALTER TYPE registrationmethod ADD VALUE IF NOT EXISTS 'WECHAT'")
    op.add_column("users", sa.Column("wechat_open_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("wechat_union_id", sa.String(length=255), nullable=True))
    op.create_index("ix_users_wechat_open_id", "users", ["wechat_open_id"], unique=True)
    op.create_index("ix_users_wechat_union_id", "users", ["wechat_union_id"], unique=True)


def downgrade() -> None:
    """降级数据库"""
    op.drop_index("ix_users_wechat_union_id", table_name="users")
    op.drop_index("ix_users_wechat_open_id", table_name="users")
    op.drop_column("users", "wechat_union_id")
    op.drop_column("users", "wechat_open_id")

"""add search history table

Revision ID: 20260227_1100
Revises: 20260227_1000
Create Date: 2026-02-27 11:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260227_1100"
down_revision = "20260227_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "search_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("query", sa.String(200), nullable=False),
        sa.Column("result_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    # 按 (query, created_at) 聚合统计用
    op.create_index("idx_search_history_query_created", "search_history", ["query", "created_at"])
    # 按用户查询历史用
    op.create_index("idx_search_history_user", "search_history", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_search_history_user")
    op.drop_index("idx_search_history_query_created")
    op.drop_table("search_history")

"""add search indexes for pg_trgm

Revision ID: 20260227_1000
Revises: 20260226_1500_add_direct_messages
Create Date: 2026-02-27 10:00:00
"""
from alembic import op

revision = "20260227_1000"
down_revision = "20260226_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 启用 pg_trgm 扩展（已存在时跳过）
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # dreams.title trigram GIN 索引（ilike '%关键词%' 自动走索引）
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_dreams_title_trgm "
        "ON dreams USING GIN (title gin_trgm_ops)"
    )

    # dreams.content trigram GIN 索引
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_dreams_content_trgm "
        "ON dreams USING GIN (content gin_trgm_ops)"
    )

    # users.username trigram GIN 索引
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_username_trgm "
        "ON users USING GIN (username gin_trgm_ops)"
    )

    # 搜索前置过滤复合索引（收窄扫描范围，加速频道过滤）
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_dreams_search_filter "
        "ON dreams (privacy_level, is_seeking_interpretation, is_featured, created_at DESC) "
        "WHERE deleted_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_dreams_search_filter")
    op.execute("DROP INDEX IF EXISTS idx_users_username_trgm")
    op.execute("DROP INDEX IF EXISTS idx_dreams_content_trgm")
    op.execute("DROP INDEX IF EXISTS idx_dreams_title_trgm")

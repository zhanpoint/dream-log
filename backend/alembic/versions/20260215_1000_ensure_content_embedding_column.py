"""Ensure content_embedding column exists on dream_embeddings.

Revision ID: 20260215_1000
Revises: 20260214_1500
Create Date: 2026-02-15 10:00:00

该迁移确保 dream_embeddings 表上有 content_embedding 列（pgvector）。
若初版迁移时 pgvector 不可用导致未添加，此迁移会补上。
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260215_1000"
down_revision: Union[str, None] = "20260214_1500"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """确保 dream_embeddings 表存在 content_embedding 列（vector 类型）及 HNSW 索引。"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("dream_embeddings")]

    if "content_embedding" in columns:
        return

    # 启用 pgvector 扩展
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
    # 添加向量列（1024 维，满足 pgvector HNSW 索引 ≤2000 维限制）
    op.execute(sa.text("ALTER TABLE dream_embeddings ADD COLUMN content_embedding vector(1024)"))
    # 创建 HNSW 索引（若已存在则跳过）
    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS idx_content_embedding_hnsw
            ON dream_embeddings
            USING hnsw (content_embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
            """
        )
    )


def downgrade() -> None:
    """移除 content_embedding 列及索引。"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("dream_embeddings")]

    if "content_embedding" not in columns:
        return

    op.execute(sa.text("DROP INDEX IF EXISTS idx_content_embedding_hnsw"))
    op.execute(sa.text("ALTER TABLE dream_embeddings DROP COLUMN IF EXISTS content_embedding"))

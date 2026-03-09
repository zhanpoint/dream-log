"""add foryou vector index for dream_embeddings

Revision ID: 20260226_1300
Revises: 20260226_1200
Create Date: 2026-02-26 13:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260226_1300"
down_revision = "20260226_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 为公开梦境的 embedding 向量创建 HNSW 索引（加速余弦相似度查询）
    # 使用部分索引，只对有 embedding 的行建索引
    # 注意：不使用 CONCURRENTLY，以兼容 Alembic 事务模式
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_dream_embeddings_content_hnsw
        ON dream_embeddings
        USING hnsw (content_embedding vector_cosine_ops)
        WHERE content_embedding IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_dream_embeddings_content_hnsw")

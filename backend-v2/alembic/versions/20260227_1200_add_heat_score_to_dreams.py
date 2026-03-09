"""add heat_score, bookmark_count, adopted_interpretation_count to dreams

Revision ID: 20260227_1200
Revises: 20260227_1100
Create Date: 2026-02-27 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260227_1200"
down_revision = "20260227_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dreams", sa.Column("bookmark_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dreams", sa.Column("adopted_interpretation_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dreams", sa.Column("heat_score", sa.Float(), nullable=False, server_default="0"))

    # 回溯 bookmark_count（有收藏的从 bookmarks 聚合，无收藏的保持默认 0）
    op.execute("""
        UPDATE dreams d SET bookmark_count = b.cnt
        FROM (SELECT dream_id, COUNT(*) AS cnt FROM bookmarks GROUP BY dream_id) b
        WHERE d.id = b.dream_id
    """)

    # 回溯 adopted_interpretation_count（0 或 1）
    op.execute("""
        UPDATE dreams d SET adopted_interpretation_count = 1
        WHERE EXISTS (
            SELECT 1 FROM comments c
            WHERE c.dream_id = d.id AND c.is_interpretation = true AND c.is_adopted = true AND c.deleted_at IS NULL
        )
    """)

    # 复合索引：最热排序分页
    op.create_index(
        "idx_dreams_heat_sort",
        "dreams",
        ["privacy_level", "deleted_at", "heat_score", "created_at"],
        postgresql_ops={"heat_score": "DESC", "created_at": "DESC"},
    )


def downgrade() -> None:
    op.drop_index("idx_dreams_heat_sort", table_name="dreams")
    op.drop_column("dreams", "heat_score")
    op.drop_column("dreams", "adopted_interpretation_count")
    op.drop_column("dreams", "bookmark_count")

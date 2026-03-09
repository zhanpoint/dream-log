"""add community groups

Revision ID: 20260226_1200
Revises: 20260226_1000
Create Date: 2026-02-26 12:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260226_1200"
down_revision = "20260226_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. communities 表 ──────────────────────────────────────────────────
    op.create_table(
        "communities",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(500), nullable=True),
        sa.Column("cover_image", sa.String(500), nullable=True),
        sa.Column("member_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("post_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("creator_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_official", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
        ),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("idx_communities_slug", "communities", ["slug"], unique=True)

    # ── 2. community_members 表 ────────────────────────────────────────────
    op.create_table(
        "community_members",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "community_id",
            UUID(as_uuid=True),
            sa.ForeignKey("communities.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "joined_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
        ),
    )

    # ── 3. 预置 4 个官方子社区 ─────────────────────────────────────────────
    op.execute("""
        INSERT INTO communities (name, slug, description, icon, is_official, sort_order) VALUES
        ('清醒梦实验室', 'lucid-dreaming', '探索清醒梦的奥秘，分享清醒梦技巧与体验', '🌟', true, 1),
        ('噩梦互助组', 'nightmare-support', '一起面对噩梦，互相支持与理解', '🌙', true, 2),
        ('连载梦剧场', 'serial-dreams', '分享有连续剧情的系列梦境故事', '📖', true, 3),
        ('飞行梦研究所', 'flying-dreams', '所有关于飞翔与自由飞行的梦境', '🦅', true, 4)
    """)


def downgrade() -> None:
    op.drop_table("community_members")
    op.drop_index("idx_communities_slug", "communities")
    op.drop_table("communities")

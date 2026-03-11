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

    # ── 3. 预置 4 个官方子社区（英文名称与描述） ───────────────────────────
    op.execute("""
        INSERT INTO communities (name, slug, description, icon, is_official, sort_order) VALUES
        ('Lucid Dream Lab', 'lucid-dreaming', 'Explore the secrets of lucid dreams and share techniques and experiences.', '🌟', true, 1),
        ('Nightmare Support Group', 'nightmare-support', 'Face nightmares together with mutual support, understanding, and care.', '🌙', true, 2),
        ('Serial Dream Theater', 'serial-dreams', 'Share serialized dream stories with continuing plots and characters.', '📖', true, 3),
        ('Flying Dream Institute', 'flying-dreams', 'All dreams about flying and the feeling of freedom in the air.', '🦅', true, 4)
    """)


def downgrade() -> None:
    op.drop_table("community_members")
    op.drop_index("idx_communities_slug", "communities")
    op.drop_table("communities")

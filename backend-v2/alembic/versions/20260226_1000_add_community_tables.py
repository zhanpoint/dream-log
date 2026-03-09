"""add community tables

Revision ID: 20260226_1000
Revises: 20260222_1200
Create Date: 2026-02-26 10:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "20260226_1000"
down_revision = "20260222_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. 扩展 NotificationType 枚举 ──────────────────────────────────────
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RESONANCE'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMMENT'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INTERPRETATION'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INTERPRETATION_ADOPTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_FOLLOWER'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DREAM_FEATURED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SIMILAR_DREAM'")

    # ── 2. dreams 表新增社区字段 ───────────────────────────────────────────
    op.add_column("dreams", sa.Column("is_seeking_interpretation", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dreams", sa.Column("community_id", UUID(as_uuid=True), nullable=True))
    op.add_column("dreams", sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dreams", sa.Column("anonymous_alias", sa.String(100), nullable=True))
    op.add_column("dreams", sa.Column("resonance_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dreams", sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dreams", sa.Column("interpretation_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dreams", sa.Column("inspiration_score", sa.Float(), nullable=False, server_default="0.0"))
    op.add_column("dreams", sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dreams", sa.Column("emotion_tags", JSONB(), nullable=False, server_default=sa.text("'[]'")))

    # ── 3. users 表新增社区字段 ───────────────────────────────────────────
    op.add_column("users", sa.Column("dreamer_title", sa.String(50), nullable=False, server_default=sa.text("'做梦者'")))
    op.add_column("users", sa.Column("dreamer_level", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("users", sa.Column("inspiration_points", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("public_dream_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("interpretation_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("follower_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("following_count", sa.Integer(), nullable=False, server_default="0"))

    # ── 4. 共鸣表 ─────────────────────────────────────────────────────────
    op.create_table(
        "resonances",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dream_id", UUID(as_uuid=True), sa.ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
        sa.UniqueConstraint("user_id", "dream_id", name="uq_resonances_user_dream"),
    )
    op.create_index("idx_resonances_dream", "resonances", ["dream_id"])
    op.create_index("idx_resonances_user", "resonances", ["user_id"])

    # ── 5. 评论表 ─────────────────────────────────────────────────────────
    op.create_table(
        "comments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("dream_id", UUID(as_uuid=True), sa.ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", UUID(as_uuid=True), sa.ForeignKey("comments.id", ondelete="CASCADE"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_interpretation", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_adopted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inspire_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("anonymous_alias", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_comments_dream", "comments", ["dream_id", "created_at"])
    op.create_index("idx_comments_user", "comments", ["user_id"])
    op.create_index("idx_comments_parent", "comments", ["parent_id"])

    # ── 6. 评论点赞/启发表 ────────────────────────────────────────────────
    op.create_table(
        "comment_likes",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("comment_id", UUID(as_uuid=True), sa.ForeignKey("comments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reaction_type", sa.String(20), nullable=False, server_default=sa.text("'like'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
        sa.PrimaryKeyConstraint("user_id", "comment_id"),
    )

    # ── 7. 用户关注表 ─────────────────────────────────────────────────────
    op.create_table(
        "user_follows",
        sa.Column("follower_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("following_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
        sa.PrimaryKeyConstraint("follower_id", "following_id"),
        sa.CheckConstraint("follower_id != following_id", name="chk_no_self_follow"),
    )
    op.create_index("idx_follows_follower", "user_follows", ["follower_id"])
    op.create_index("idx_follows_following", "user_follows", ["following_id"])

    # ── 8. 收藏表 ─────────────────────────────────────────────────────────
    op.create_table(
        "bookmarks",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dream_id", UUID(as_uuid=True), sa.ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
        sa.PrimaryKeyConstraint("user_id", "dream_id"),
    )

    # ── 9. 内容举报表 ─────────────────────────────────────────────────────
    op.create_table(
        "reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("reporter_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())")),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("bookmarks")
    op.drop_index("idx_follows_following", table_name="user_follows")
    op.drop_index("idx_follows_follower", table_name="user_follows")
    op.drop_table("user_follows")
    op.drop_table("comment_likes")
    op.drop_index("idx_comments_parent", table_name="comments")
    op.drop_index("idx_comments_user", table_name="comments")
    op.drop_index("idx_comments_dream", table_name="comments")
    op.drop_table("comments")
    op.drop_index("idx_resonances_user", table_name="resonances")
    op.drop_index("idx_resonances_dream", table_name="resonances")
    op.drop_table("resonances")

    for col in ["follower_count", "following_count", "interpretation_count", "public_dream_count", "inspiration_points", "dreamer_level", "dreamer_title"]:
        op.drop_column("users", col)

    for col in ["emotion_tags", "is_featured", "inspiration_score", "interpretation_count", "comment_count", "resonance_count", "anonymous_alias", "is_anonymous", "community_id", "is_seeking_interpretation"]:
        op.drop_column("dreams", col)

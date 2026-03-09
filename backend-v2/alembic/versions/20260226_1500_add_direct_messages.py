"""add dm_conversations and direct_messages tables for one-on-one private chat

Revision ID: 20260226_1500
Revises: 20260226_1400
Create Date: 2026-02-26 15:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260226_1500"
down_revision = "20260226_1400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. dm_conversations 表 ────────────────────────────────────────────────
    op.create_table(
        "dm_conversations",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "initiator_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipient_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # pending / active / blocked
        sa.Column(
            "status",
            sa.String(20),
            server_default="pending",
            nullable=False,
        ),
        # 来源梦境（发起私信时关联的梦境卡片）
        sa.Column(
            "source_dream_id",
            UUID(as_uuid=True),
            sa.ForeignKey("dreams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("last_message_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # 每对用户只能有一个会话
        sa.UniqueConstraint("initiator_id", "recipient_id", name="uq_dm_conv_pair"),
    )
    op.create_index("idx_dm_conv_initiator", "dm_conversations", ["initiator_id"])
    op.create_index("idx_dm_conv_recipient", "dm_conversations", ["recipient_id"])

    # ── 2. direct_messages 表 ────────────────────────────────────────────────
    op.create_table(
        "direct_messages",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "conversation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("dm_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        # 敲门消息强制 text；active 状态下支持 image/rich
        sa.Column(
            "content_type",
            sa.String(20),
            server_default="text",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_direct_messages_conv_created",
        "direct_messages",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_direct_messages_conv_created", table_name="direct_messages")
    op.drop_table("direct_messages")
    op.drop_index("idx_dm_conv_recipient", table_name="dm_conversations")
    op.drop_index("idx_dm_conv_initiator", table_name="dm_conversations")
    op.drop_table("dm_conversations")

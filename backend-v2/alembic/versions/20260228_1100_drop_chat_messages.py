"""drop chat_messages table (dream chatroom removed)

Revision ID: 20260228_1100
Revises: 20260228_1000
Create Date: 2026-02-28 11:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260228_1100"
down_revision = "20260228_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("idx_chat_messages_dream_created", table_name="chat_messages")
    op.drop_table("chat_messages")


def downgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "dream_id",
            UUID(as_uuid=True),
            sa.ForeignKey("dreams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_chat_messages_dream_created",
        "chat_messages",
        ["dream_id", "created_at"],
    )

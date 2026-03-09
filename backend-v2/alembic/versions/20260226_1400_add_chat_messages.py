"""add chat_messages table for realtime dream chat

Revision ID: 20260226_1400
Revises: 20260226_1300
Create Date: 2026-02-26 14:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260226_1400"
down_revision = "20260226_1300"
branch_labels = None
depends_on = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index("idx_chat_messages_dream_created", table_name="chat_messages")
    op.drop_table("chat_messages")

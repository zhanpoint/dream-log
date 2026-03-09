"""add_notifications_table

Revision ID: 636fe11381cf
Revises: 5e4784a1b834
Create Date: 2026-02-10 13:54:08.756432

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '636fe11381cf'
down_revision: str | None = '5e4784a1b834'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """创建 notifications 表"""
    # SQLAlchemy 会自动创建枚举类型，不需要手动创建
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.Enum('MONTHLY_REPORT', 'PATTERN_DISCOVERY', name='notification_type', create_type=False), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("timezone('Asia/Shanghai', now())"), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index('idx_notifications_user_unread', 'notifications', ['user_id', 'is_read'], unique=False)


def downgrade() -> None:
    """删除 notifications 表"""
    op.drop_index('idx_notifications_user_unread', table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
    # 枚举类型由 SQLAlchemy 自动管理

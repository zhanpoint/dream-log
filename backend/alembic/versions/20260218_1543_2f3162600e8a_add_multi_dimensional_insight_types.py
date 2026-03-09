"""add_multi_dimensional_insight_types

Revision ID: 2f3162600e8a
Revises: 20260215_1000
Create Date: 2026-02-18 15:43:09.676276

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '2f3162600e8a'
down_revision: str | None = '20260215_1000'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库 - 新增多维度洞察报告字段"""
    # 扩展 insight_type 枚举（PostgreSQL 需要先添加新值）
    op.execute("ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'WEEKLY'")
    op.execute("ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'ANNUAL'")
    op.execute("ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'EMOTION_HEALTH'")
    op.execute("ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'SLEEP_QUALITY'")
    op.execute("ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'THEME_PATTERN'")

    # 新增 user_insight_settings 字段
    op.add_column('user_insight_settings', sa.Column('weekly_report_enabled', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('user_insight_settings', sa.Column('annual_report_enabled', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('user_insight_settings', sa.Column('show_comparison', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user_insight_settings', sa.Column('notify_on_weekly_report', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    """降级数据库"""
    op.drop_column('user_insight_settings', 'notify_on_weekly_report')
    op.drop_column('user_insight_settings', 'show_comparison')
    op.drop_column('user_insight_settings', 'annual_report_enabled')
    op.drop_column('user_insight_settings', 'weekly_report_enabled')

"""merge notification settings into single field

Revision ID: e0987f1391d7
Revises: update_notification_type_v2
Create Date: 2026-02-18 17:08:40.253021

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e0987f1391d7'
down_revision: str | None = 'update_notification_type_v2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    # 1. 添加新的统一通知字段（默认值为 true）
    op.add_column(
        'user_insight_settings',
        sa.Column('notify_on_reports', sa.Boolean(), nullable=False, server_default='true')
    )
    
    # 2. 将旧字段的值迁移到新字段（如果任一旧字段为 true，则新字段为 true）
    op.execute("""
        UPDATE user_insight_settings
        SET notify_on_reports = (notify_on_monthly_report OR notify_on_weekly_report)
    """)
    
    # 3. 删除旧的通知字段
    op.drop_column('user_insight_settings', 'notify_on_monthly_report')
    op.drop_column('user_insight_settings', 'notify_on_weekly_report')


def downgrade() -> None:
    """降级数据库"""
    # 1. 重新添加旧的通知字段
    op.add_column(
        'user_insight_settings',
        sa.Column('notify_on_monthly_report', sa.Boolean(), nullable=False, server_default='true')
    )
    op.add_column(
        'user_insight_settings',
        sa.Column('notify_on_weekly_report', sa.Boolean(), nullable=False, server_default='true')
    )
    
    # 2. 将新字段的值迁移回旧字段
    op.execute("""
        UPDATE user_insight_settings
        SET notify_on_monthly_report = notify_on_reports,
            notify_on_weekly_report = notify_on_reports
    """)
    
    # 3. 删除新字段
    op.drop_column('user_insight_settings', 'notify_on_reports')

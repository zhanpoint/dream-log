"""update_notification_type_enum

Revision ID: update_notification_type_v2
Revises: 2f3162600e8a
Create Date: 2026-02-18 20:00:00.000000

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'update_notification_type_v2'
down_revision: str | None = '2f3162600e8a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """更新 notification_type 枚举：移除 PATTERN_DISCOVERY，新增 WEEKLY_REPORT 和 ANNUAL_REPORT"""
    # 新增新的枚举值
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'WEEKLY_REPORT'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ANNUAL_REPORT'")
    # 注意：PostgreSQL 不支持直接删除枚举值，PATTERN_DISCOVERY 保留在枚举中但不再使用


def downgrade() -> None:
    """降级：无法移除枚举值，仅标记"""
    pass

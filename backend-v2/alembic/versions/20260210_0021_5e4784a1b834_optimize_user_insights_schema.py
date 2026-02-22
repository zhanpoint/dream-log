"""optimize_user_insights_schema

优化用户洞察报告表结构：
1. 简化 InsightType: 只保留 MONTHLY 和 PATTERN
2. user_insights 表优化:
   - 移除 is_auto_generated (冗余)
   - time_period_start/end 改为可选 (PATTERN 不需要)
   - 新增 title (报告标题)
   - 新增 read_at (阅读时间)
   - 新增 expires_at (过期时间)
3. user_insight_settings 表优化:
   - 移除 auto_generate_frequency (简化为月报)
   - 移除 preferred_day, preferred_time (过度设计)
   - 移除 notification_method (简化为 PUSH)
   - 移除 include_* 字段 (过度设计)
   - 新增简化的配置字段

Revision ID: 5e4784a1b834
Revises: 154a136b77b6
Create Date: 2026-02-10 00:21:48.110230

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5e4784a1b834'
down_revision: str | None = '154a136b77b6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    
    # ========== 第一步：修改 user_insights 表 ==========
    
    # 1. 添加新字段
    op.add_column('user_insights', sa.Column('title', sa.String(length=200), nullable=True))
    op.add_column('user_insights', sa.Column('read_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user_insights', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    
    # 2. 修改 time_period 字段为可选
    op.alter_column('user_insights', 'time_period_start',
                    existing_type=sa.DATE(),
                    nullable=True)
    op.alter_column('user_insights', 'time_period_end',
                    existing_type=sa.DATE(),
                    nullable=True)
    
    # 3. 为现有数据生成默认标题（根据类型）
    op.execute("""
        UPDATE user_insights 
        SET title = CASE 
            WHEN insight_type = 'WEEKLY' THEN '周度梦境报告'
            WHEN insight_type = 'MONTHLY' THEN '月度梦境报告'
            WHEN insight_type = 'PATTERN' THEN '梦境模式发现'
            WHEN insight_type = 'RECOMMENDATION' THEN '个性化建议'
            ELSE '洞察报告'
        END
        WHERE title IS NULL
    """)
    
    # 4. 设置过期时间（6个月后）
    op.execute("""
        UPDATE user_insights 
        SET expires_at = created_at + INTERVAL '6 months'
        WHERE expires_at IS NULL
    """)
    
    # 5. 删除 WEEKLY 和 RECOMMENDATION 类型的数据（已废弃）
    op.execute("DELETE FROM user_insights WHERE insight_type IN ('WEEKLY', 'RECOMMENDATION')")
    
    # 6. 更新 InsightType 枚举（移除 WEEKLY 和 RECOMMENDATION）
    # PostgreSQL 不支持直接修改枚举，需要创建新枚举
    op.execute("ALTER TYPE insight_type RENAME TO insight_type_old")
    op.execute("CREATE TYPE insight_type AS ENUM ('MONTHLY', 'PATTERN')")
    op.execute("""
        ALTER TABLE user_insights 
        ALTER COLUMN insight_type TYPE insight_type 
        USING insight_type::text::insight_type
    """)
    op.execute("DROP TYPE insight_type_old")
    
    # 7. 设置 title 为必填
    op.alter_column('user_insights', 'title',
                    existing_type=sa.String(length=200),
                    nullable=False)
    
    # 8. 删除冗余字段
    op.drop_column('user_insights', 'is_auto_generated')
    
    # ========== 第二步：修改 user_insight_settings 表 ==========
    
    # 1. 添加新字段
    op.add_column('user_insight_settings', sa.Column('monthly_report_enabled', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('pattern_discovery_enabled', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('pattern_min_occurrences', sa.Integer(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('notify_on_monthly_report', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('notify_on_pattern', sa.Boolean(), nullable=True))
    
    # 2. 迁移现有数据
    op.execute("""
        UPDATE user_insight_settings 
        SET 
            monthly_report_enabled = auto_generate_enabled,
            pattern_discovery_enabled = auto_generate_enabled,
            pattern_min_occurrences = 3,
            notify_on_monthly_report = notify_on_generation,
            notify_on_pattern = notify_on_generation
    """)
    
    # 3. 设置新字段为必填
    op.alter_column('user_insight_settings', 'monthly_report_enabled',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'pattern_discovery_enabled',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'pattern_min_occurrences',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'notify_on_monthly_report',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'notify_on_pattern',
                    existing_type=sa.Boolean(),
                    nullable=False)
    
    # 4. 删除废弃字段
    op.drop_column('user_insight_settings', 'auto_generate_enabled')
    op.drop_column('user_insight_settings', 'auto_generate_frequency')
    op.drop_column('user_insight_settings', 'preferred_day')
    op.drop_column('user_insight_settings', 'preferred_time')
    op.drop_column('user_insight_settings', 'notify_on_generation')
    op.drop_column('user_insight_settings', 'notification_method')
    op.drop_column('user_insight_settings', 'include_trigger_analysis')
    op.drop_column('user_insight_settings', 'include_emotion_trends')
    op.drop_column('user_insight_settings', 'include_sleep_correlation')
    
    # ========== 第三步：删除废弃的枚举类型 ==========
    op.execute("DROP TYPE IF EXISTS insight_frequency")
    op.execute("DROP TYPE IF EXISTS notification_method")


def downgrade() -> None:
    """降级数据库"""
    
    # ========== 恢复 user_insight_settings 表 ==========
    
    # 1. 恢复枚举类型
    op.execute("CREATE TYPE insight_frequency AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY')")
    op.execute("CREATE TYPE notification_method AS ENUM ('EMAIL', 'PUSH', 'BOTH')")
    
    # 2. 恢复旧字段
    op.add_column('user_insight_settings', sa.Column('auto_generate_enabled', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('auto_generate_frequency', sa.Enum('WEEKLY', 'BIWEEKLY', 'MONTHLY', name='insight_frequency'), nullable=True))
    op.add_column('user_insight_settings', sa.Column('preferred_day', sa.SmallInteger(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('preferred_time', sa.Time(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('notify_on_generation', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('notification_method', sa.Enum('EMAIL', 'PUSH', 'BOTH', name='notification_method'), nullable=True))
    op.add_column('user_insight_settings', sa.Column('include_trigger_analysis', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('include_emotion_trends', sa.Boolean(), nullable=True))
    op.add_column('user_insight_settings', sa.Column('include_sleep_correlation', sa.Boolean(), nullable=True))
    
    # 3. 恢复数据
    op.execute("""
        UPDATE user_insight_settings 
        SET 
            auto_generate_enabled = monthly_report_enabled,
            auto_generate_frequency = 'WEEKLY',
            notify_on_generation = notify_on_monthly_report,
            notification_method = 'PUSH',
            include_trigger_analysis = TRUE,
            include_emotion_trends = TRUE,
            include_sleep_correlation = TRUE
    """)
    
    # 4. 设置必填
    op.alter_column('user_insight_settings', 'auto_generate_enabled',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'auto_generate_frequency',
                    existing_type=sa.Enum('WEEKLY', 'BIWEEKLY', 'MONTHLY', name='insight_frequency'),
                    nullable=False)
    op.alter_column('user_insight_settings', 'notify_on_generation',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'notification_method',
                    existing_type=sa.Enum('EMAIL', 'PUSH', 'BOTH', name='notification_method'),
                    nullable=False)
    op.alter_column('user_insight_settings', 'include_trigger_analysis',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'include_emotion_trends',
                    existing_type=sa.Boolean(),
                    nullable=False)
    op.alter_column('user_insight_settings', 'include_sleep_correlation',
                    existing_type=sa.Boolean(),
                    nullable=False)
    
    # 5. 删除新字段
    op.drop_column('user_insight_settings', 'notify_on_pattern')
    op.drop_column('user_insight_settings', 'notify_on_monthly_report')
    op.drop_column('user_insight_settings', 'pattern_min_occurrences')
    op.drop_column('user_insight_settings', 'pattern_discovery_enabled')
    op.drop_column('user_insight_settings', 'monthly_report_enabled')
    
    # ========== 恢复 user_insights 表 ==========
    
    # 1. 添加回 is_auto_generated
    op.add_column('user_insights', sa.Column('is_auto_generated', sa.Boolean(), nullable=True))
    op.execute("UPDATE user_insights SET is_auto_generated = TRUE")
    op.alter_column('user_insights', 'is_auto_generated',
                    existing_type=sa.Boolean(),
                    nullable=False)
    
    # 2. 恢复 InsightType 枚举
    op.execute("ALTER TYPE insight_type RENAME TO insight_type_old")
    op.execute("CREATE TYPE insight_type AS ENUM ('WEEKLY', 'MONTHLY', 'PATTERN', 'RECOMMENDATION')")
    op.execute("""
        ALTER TABLE user_insights 
        ALTER COLUMN insight_type TYPE insight_type 
        USING insight_type::text::insight_type
    """)
    op.execute("DROP TYPE insight_type_old")
    
    # 3. time_period 改为必填
    op.alter_column('user_insights', 'time_period_end',
                    existing_type=sa.DATE(),
                    nullable=False)
    op.alter_column('user_insights', 'time_period_start',
                    existing_type=sa.DATE(),
                    nullable=False)
    
    # 4. 删除新字段
    op.drop_column('user_insights', 'expires_at')
    op.drop_column('user_insights', 'read_at')
    op.drop_column('user_insights', 'title')

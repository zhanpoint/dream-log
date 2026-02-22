"""
用户洞察报告模型 - user_insights 表 + user_insight_settings 表
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import InsightType
from app.models.user import shanghai_now


class UserInsight(Base):
    """用户洞察报告表"""

    __tablename__ = "user_insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 报告类型
    insight_type: Mapped[InsightType] = mapped_column(
        Enum(InsightType, name="insight_type"), nullable=False
    )

    # 时间范围（仅 MONTHLY 使用）
    time_period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    time_period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 洞察内容
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 用户交互
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # 元数据
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<UserInsight(id={self.id}, type={self.insight_type}, title={self.title})>"


class UserInsightSettings(Base):
    """用户洞察报告配置表"""

    __tablename__ = "user_insight_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # 月报配置
    monthly_report_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 周报配置
    weekly_report_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 年度回顾配置
    annual_report_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 显示变化对比（默认关闭）
    show_comparison: Mapped[bool] = mapped_column(Boolean, default=False)

    # 通知配置（统一开关，控制所有定期报告的通知）
    notify_on_reports: Mapped[bool] = mapped_column(Boolean, default=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=shanghai_now,
        onupdate=shanghai_now,
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<UserInsightSettings(user_id={self.user_id})>"

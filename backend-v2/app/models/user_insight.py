"""
用户洞察报告模型 - user_insights 表 + user_insight_settings 表
"""

import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    SmallInteger,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import InsightFrequency, InsightType, NotificationMethod
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
    time_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    time_period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # 洞察内容
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 用户交互
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_auto_generated: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    def __repr__(self) -> str:
        return f"<UserInsight(id={self.id}, type={self.insight_type})>"


class UserInsightSettings(Base):
    """用户洞察报告配置表"""

    __tablename__ = "user_insight_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # 洞察报告配置
    auto_generate_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_generate_frequency: Mapped[InsightFrequency] = mapped_column(
        Enum(InsightFrequency, name="insight_frequency"),
        default=InsightFrequency.WEEKLY,
    )
    preferred_day: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    preferred_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    # 通知配置
    notify_on_generation: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_method: Mapped[NotificationMethod] = mapped_column(
        Enum(NotificationMethod, name="notification_method"),
        default=NotificationMethod.PUSH,
    )

    # 报告偏好
    include_trigger_analysis: Mapped[bool] = mapped_column(Boolean, default=True)
    include_emotion_trends: Mapped[bool] = mapped_column(Boolean, default=True)
    include_sleep_correlation: Mapped[bool] = mapped_column(Boolean, default=True)

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

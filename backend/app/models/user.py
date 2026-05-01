"""
用户模型
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.subscription import UserSubscription

# 东八区时区
SHANGHAI_TZ = timezone(timedelta(hours=8))


def shanghai_now() -> datetime:
    """获取当前东八区时间"""
    return datetime.now(SHANGHAI_TZ)


class RegistrationMethod(enum.StrEnum):
    """注册方式枚举"""

    EMAIL = "email"
    GOOGLE = "google"
    WECHAT = "wechat"


class User(Base):
    """用户模型"""

    __tablename__ = "users"

    # 主键
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # 基本信息
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # OAuth 字段
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    wechat_open_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    wechat_union_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 个人资料
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 语言偏好（用于定时任务等无请求头场景）
    # 存储 i18n locale，如：cn / en / ja；为空表示未设置（由后端默认策略兜底）
    preferred_locale: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # 注册信息
    registration_method: Mapped[RegistrationMethod] = mapped_column(
        Enum(RegistrationMethod), default=RegistrationMethod.EMAIL
    )

    # ========== 社区字段 ==========
    dreamer_title: Mapped[str] = mapped_column(String(50), default="做梦者")
    dreamer_level: Mapped[int] = mapped_column(Integer, default=1)
    inspiration_points: Mapped[int] = mapped_column(Integer, default=0)
    public_dream_count: Mapped[int] = mapped_column(Integer, default=0)
    interpretation_count: Mapped[int] = mapped_column(Integer, default=0)
    follower_count: Mapped[int] = mapped_column(Integer, default=0)
    following_count: Mapped[int] = mapped_column(Integer, default=0)

    bookmarks_visibility: Mapped[str] = mapped_column(String(20), default="private")
    created_communities_visibility: Mapped[str] = mapped_column(String(20), default="private")
    joined_communities_visibility: Mapped[str] = mapped_column(String(20), default="private")

    # 时间戳（东八区上海时间）
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

    subscription: Mapped[UserSubscription] = relationship(
        "UserSubscription",
        backref="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"

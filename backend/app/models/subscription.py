"""
用户订阅模型
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserSubscription(Base):
    """用户订阅状态"""

    __tablename__ = "user_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )

    plan_type: Mapped[str] = mapped_column(String(20), default="free")
    status: Mapped[str] = mapped_column(String(30), default="active")
    status_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)

    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Stripe subscription pending_update 兼容字段（记录待生效的变更，避免前后端误判）
    pending_stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pending_plan_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pending_effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('UTC', now())"),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<UserSubscription(user_id={self.user_id}, plan={self.plan_type})>"

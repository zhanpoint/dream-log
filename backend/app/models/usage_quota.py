"""用户额度统计模型。"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def month_start(dt: datetime) -> date:
    return date(dt.year, dt.month, 1)


class UserQuotaUsage(Base):
    """用户月度额度使用记录。"""

    __tablename__ = "user_quota_usage"
    __table_args__ = (UniqueConstraint("user_id", "period_start", name="uq_quota_user_period"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)

    dream_analysis_used: Mapped[int] = mapped_column(Integer, default=0)
    title_analysis_used: Mapped[int] = mapped_column(Integer, default=0)
    image_generation_used: Mapped[int] = mapped_column(Integer, default=0)
    weekly_reports_used: Mapped[int] = mapped_column(Integer, default=0)
    monthly_reports_used: Mapped[int] = mapped_column(Integer, default=0)
    yearly_reports_used: Mapped[int] = mapped_column(Integer, default=0)
    topic_reports_used: Mapped[int] = mapped_column(Integer, default=0)

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
        return f"<UserQuotaUsage(user_id={self.user_id}, period_start={self.period_start})>"

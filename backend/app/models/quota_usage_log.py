"""用户额度使用日志。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class QuotaUsageLog(Base):
    """额度使用流水日志，用于审计与统计。"""

    __tablename__ = "quota_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, default=1)
    plan_type: Mapped[str] = mapped_column(String(20), nullable=False)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meta: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('UTC', now())"),
    )

    def __repr__(self) -> str:
        return f"<QuotaUsageLog(user_id={self.user_id}, action={self.action})>"

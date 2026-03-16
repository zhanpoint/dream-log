"""
Stripe webhook event 去重表（幂等）。
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class StripeWebhookEvent(Base):
    """记录已处理的 Stripe webhook event，用于幂等去重与审计。"""

    __tablename__ = "stripe_webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    event_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    livemode: Mapped[bool] = mapped_column(Boolean, default=False)
    created: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    # received/processing/processed/failed
    processing_status: Mapped[str] = mapped_column(String(20), default="received")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('UTC', now())"),
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=True,
    )


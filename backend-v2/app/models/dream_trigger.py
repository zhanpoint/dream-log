"""
梦境触发因素模型 - 自由文本 (AI 生成)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, SmallInteger, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamTrigger(Base):
    __tablename__ = "dream_triggers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reasoning: Mapped[str | None] = mapped_column(String(200), nullable=True)
    confidence: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    dream: Mapped[Dream] = relationship("Dream", back_populates="trigger_mappings")

    __table_args__ = (
        Index("idx_dream_triggers_dream_id", "dream_id"),
        Index("idx_dream_triggers_trigger_name", "trigger_name"),
    )

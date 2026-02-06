"""
触发因素模型 - triggers 表 + dream_triggers 关联表 (M:N)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import TriggerCategory

if TYPE_CHECKING:
    from app.models.dream import Dream


class Trigger(Base):
    """触发因素字典表"""

    __tablename__ = "triggers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    trigger_key: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[TriggerCategory] = mapped_column(
        Enum(TriggerCategory, name="trigger_category"), nullable=False
    )

    # 统计分析
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    nightmare_correlation: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ORM 关系
    dream_triggers: Mapped[list[DreamTrigger]] = relationship(
        "DreamTrigger", back_populates="trigger", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Trigger(key={self.trigger_key})>"


class DreamTrigger(Base):
    """梦境-触发因素关联表 (M:N)"""

    __tablename__ = "dream_triggers"

    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    trigger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("triggers.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # 用户评估的关联强度
    confidence: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="trigger_mappings")
    trigger: Mapped[Trigger] = relationship("Trigger", back_populates="dream_triggers")

    # 复合索引
    __table_args__ = (Index("idx_trigger_dream", "trigger_id", "dream_id"),)

    def __repr__(self) -> str:
        return f"<DreamTrigger(dream_id={self.dream_id}, trigger_id={self.trigger_id})>"

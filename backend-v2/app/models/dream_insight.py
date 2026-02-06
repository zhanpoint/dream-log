"""
梦境洞察模型 - dream_insights 表 (1:1 关联,存储大文本)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamInsight(Base):
    """
    梦境洞察表 - 存储用户输入的大文本和 AI 结构化分析结果
    与 dreams 表 1:1 关系，列表查询时不加载
    """

    __tablename__ = "dream_insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # 用户输入的大文本
    life_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_interpretation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI 结构化内容
    content_structured: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # 结构: {events, characters, locations, timeline, conflicts, goals, relationships, perspective}

    # AI 分析大文本
    ai_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # 结构: {summary, cognitive_analysis, emotion_analysis, narrative_structure, sleep_correlation, recommendations}

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

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="insight")

    def __repr__(self) -> str:
        return f"<DreamInsight(id={self.id}, dream_id={self.dream_id})>"

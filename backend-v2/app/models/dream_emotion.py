"""
梦境情绪关联模型 - dream_emotions 表 (1:N)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EmotionSource, EmotionTypeEnum

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamEmotion(Base):
    """
    梦境情绪关联表 - 基于 Plutchik 8 基础情绪，支持高效聚合
    每个梦境每种情绪只能有一条记录
    """

    __tablename__ = "dream_emotions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 情绪类型
    emotion_type: Mapped[EmotionTypeEnum] = mapped_column(
        Enum(EmotionTypeEnum, name="emotion_type_enum"),
        nullable=False,
        index=True,
    )

    # 情绪强度/权重 (0-1)
    score: Mapped[float] = mapped_column(Float, nullable=False)

    # 来源
    source: Mapped[EmotionSource] = mapped_column(
        Enum(EmotionSource, name="emotion_source"),
        default=EmotionSource.AI,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="emotions")

    # 复合索引 + 唯一约束
    __table_args__ = (
        Index("idx_dream_emotion_type_score", "dream_id", "emotion_type", "score"),
        UniqueConstraint("dream_id", "emotion_type", name="uq_dream_emotion_type"),
    )

    def __repr__(self) -> str:
        return f"<DreamEmotion(dream_id={self.dream_id}, type={self.emotion_type}, score={self.score})>"

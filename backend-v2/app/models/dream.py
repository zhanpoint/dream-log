"""
梦境核心模型 - dreams 主表 (轻量化设计)
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AIProcessingStatus, AwakeningState, PrivacyLevel
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream_analysis import DreamAnalysisTask
    from app.models.dream_attachment import DreamAttachment
    from app.models.dream_embedding import DreamEmbedding
    from app.models.dream_emotion import DreamEmotion
    from app.models.dream_insight import DreamInsight
    from app.models.dream_symbol import DreamSymbol
    from app.models.dream_tag import DreamTag
    from app.models.dream_trigger import DreamTrigger
    from app.models.dream_type import DreamTypeMapping


class Dream(Base):
    """
    梦境主表 - 仅保留查询和列表展示必需字段
    大文本 AI 分析内容分离到 dream_insights 表
    """

    __tablename__ = "dreams"

    # 主键
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ========== 基础信息 ==========
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title_generated_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    is_draft: Mapped[bool] = mapped_column(Boolean, default=False)

    # ========== 时间维度 ==========
    dream_date: Mapped[date] = mapped_column(Date, nullable=False)
    dream_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=shanghai_now
    )
    awakening_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_nap: Mapped[bool] = mapped_column(Boolean, default=False)

    # ========== 睡眠上下文 ==========
    sleep_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awakening_state: Mapped[AwakeningState | None] = mapped_column(
        Enum(AwakeningState, name="awakening_state"), nullable=True
    )

    # ========== 睡眠质量系统 ==========
    sleep_quality: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    sleep_fragmented: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    sleep_depth: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== 核心内容 ==========
    content: Mapped[str] = mapped_column(Text, nullable=False)
    completeness_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== 情绪与感受 (提升关键字段) ==========
    primary_emotion: Mapped[str | None] = mapped_column(String(32), nullable=True)
    emotion_intensity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    emotion_residual: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    emotion_conflict_index: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ========== 梦境特征 ==========
    lucidity_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vividness_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== 感官体验 (0-1 浮点数) ==========
    sensory_visual: Mapped[float | None] = mapped_column(Float, nullable=True)
    sensory_auditory: Mapped[float | None] = mapped_column(Float, nullable=True)
    sensory_tactile: Mapped[float | None] = mapped_column(Float, nullable=True)
    sensory_olfactory: Mapped[float | None] = mapped_column(Float, nullable=True)
    sensory_gustatory: Mapped[float | None] = mapped_column(Float, nullable=True)
    sensory_spatial: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ========== 现实关联 ==========
    reality_correlation: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== AI 分析状态 ==========
    ai_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_processing_status: Mapped[AIProcessingStatus] = mapped_column(
        Enum(AIProcessingStatus, name="ai_processing_status"),
        default=AIProcessingStatus.PENDING,
    )
    ai_processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ========== 元数据 ==========
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel, name="privacy_level"),
        default=PrivacyLevel.PRIVATE,
    )
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # ========== 关联 ==========
    parent_dream_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # ========== 时间戳 ==========
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
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ========== ORM 关系 ==========
    insight: Mapped[DreamInsight | None] = relationship(
        "DreamInsight", back_populates="dream", uselist=False, lazy="noload"
    )
    embedding: Mapped[DreamEmbedding | None] = relationship(
        "DreamEmbedding", back_populates="dream", uselist=False, lazy="noload"
    )
    emotions: Mapped[list[DreamEmotion]] = relationship(
        "DreamEmotion", back_populates="dream", lazy="selectin"
    )
    type_mappings: Mapped[list[DreamTypeMapping]] = relationship(
        "DreamTypeMapping", back_populates="dream", lazy="selectin"
    )
    trigger_mappings: Mapped[list[DreamTrigger]] = relationship(
        "DreamTrigger", back_populates="dream", lazy="selectin"
    )
    attachments: Mapped[list[DreamAttachment]] = relationship(
        "DreamAttachment", back_populates="dream", lazy="selectin"
    )
    symbols: Mapped[list[DreamSymbol]] = relationship(
        "DreamSymbol", back_populates="dream", lazy="noload"
    )
    tags: Mapped[list[DreamTag]] = relationship(
        "DreamTag", back_populates="dream", lazy="selectin"
    )
    analysis_tasks: Mapped[list[DreamAnalysisTask]] = relationship(
        "DreamAnalysisTask", back_populates="dream", lazy="noload"
    )

    # ========== 复合索引 ==========
    __table_args__ = (
        Index("idx_dreams_user_date", "user_id", "dream_date"),
        Index("idx_dreams_emotion", "user_id", "primary_emotion", "emotion_intensity"),
        Index("idx_dreams_quality", "user_id", "sleep_quality", "vividness_level"),
    )

    def __repr__(self) -> str:
        return f"<Dream(id={self.id}, title={self.title})>"

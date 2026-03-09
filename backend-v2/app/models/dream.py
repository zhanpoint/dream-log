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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AIProcessingStatus, AwakeningState, PrivacyLevel
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream_attachment import DreamAttachment
    from app.models.dream_embedding import DreamEmbedding
    from app.models.dream_insight import DreamInsight
    from app.models.dream_relation import DreamRelation
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
    sleep_start_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="入睡时间"
    )
    awakening_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="醒来时间"
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

    # ========== 梦境特征 ==========
    lucidity_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vividness_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== 现实关联 ==========
    reality_correlation: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ========== AI 生成图像 ==========
    ai_image_url: Mapped[str | None] = mapped_column(Text, nullable=True, comment="AI 生成的梦境图像 OSS URL")

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

    # ========== 社区字段 ==========
    is_seeking_interpretation: Mapped[bool] = mapped_column(Boolean, default=False)
    community_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    anonymous_alias: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resonance_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    interpretation_count: Mapped[int] = mapped_column(Integer, default=0)
    bookmark_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    adopted_interpretation_count: Mapped[int] = mapped_column(Integer, default=0)
    heat_score: Mapped[float] = mapped_column(Float, default=0.0)
    inspiration_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    feature_mode: Mapped[str] = mapped_column(String(16), default="AUTO", nullable=False)
    featured_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    featured_score_snapshot: Mapped[float | None] = mapped_column(Float, nullable=True)
    featured_updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    emotion_tags: Mapped[list] = mapped_column(JSONB, default=list)

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
    # cascade 使删除梦境时 ORM 先删关联行，避免先 SET dream_id=NULL 触发 NOT NULL 约束
    insight: Mapped[DreamInsight | None] = relationship(
        "DreamInsight", back_populates="dream", uselist=False, lazy="noload", cascade="all, delete-orphan"
    )
    embedding: Mapped[DreamEmbedding | None] = relationship(
        "DreamEmbedding", back_populates="dream", uselist=False, lazy="noload", cascade="all, delete-orphan"
    )
    type_mappings: Mapped[list[DreamTypeMapping]] = relationship(
        "DreamTypeMapping", back_populates="dream", lazy="selectin", cascade="all, delete-orphan"
    )
    trigger_mappings: Mapped[list[DreamTrigger]] = relationship(
        "DreamTrigger", back_populates="dream", lazy="selectin", cascade="all, delete-orphan"
    )
    attachments: Mapped[list[DreamAttachment]] = relationship(
        "DreamAttachment", back_populates="dream", lazy="selectin", cascade="all, delete-orphan"
    )
    symbols: Mapped[list[DreamSymbol]] = relationship(
        "DreamSymbol", back_populates="dream", lazy="noload", cascade="all, delete-orphan"
    )
    tags: Mapped[list[DreamTag]] = relationship(
        "DreamTag", back_populates="dream", lazy="selectin", cascade="all, delete-orphan"
    )

    # 梦境关联
    outgoing_relations: Mapped[list[DreamRelation]] = relationship(
        "DreamRelation",
        foreign_keys="[DreamRelation.source_dream_id]",
        back_populates="source_dream",
        lazy="noload",
        cascade="all, delete-orphan",
    )
    incoming_relations: Mapped[list[DreamRelation]] = relationship(
        "DreamRelation",
        foreign_keys="[DreamRelation.target_dream_id]",
        back_populates="target_dream",
        lazy="noload",
        cascade="all, delete-orphan",
    )

    # ========== 复合索引 ==========
    __table_args__ = (
        Index("idx_dreams_user_date", "user_id", "dream_date"),
        Index("idx_dreams_emotion", "user_id", "primary_emotion", "emotion_intensity"),
        Index("idx_dreams_quality", "user_id", "sleep_quality", "vividness_level"),
    )

    def __repr__(self) -> str:
        return f"<Dream(id={self.id}, title={self.title})>"

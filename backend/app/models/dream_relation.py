"""
梦境关联模型 - dream_relations 表
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EmotionSource, RelationType

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamRelation(Base):
    """梦境关联表 - 记录梦境之间的相似/续集关系"""

    __tablename__ = "dream_relations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 关联类型
    relation_type: Mapped[RelationType] = mapped_column(
        Enum(RelationType, name="relation_type"), nullable=False
    )

    # 相似度评分 (仅用于 SIMILAR 类型，基于向量余弦相似度)
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 关联维度 (如: {"emotion": 0.8, "symbol": 0.6, "narrative": 0.3})
    relation_dimensions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 来源: USER (用户手动标记) or AI (自动发现)
    created_by: Mapped[EmotionSource] = mapped_column(
        Enum(EmotionSource, name="emotion_source", create_type=False),
        default=EmotionSource.AI,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    source_dream: Mapped[Dream] = relationship(
        "Dream", foreign_keys=[source_dream_id], back_populates="outgoing_relations"
    )
    target_dream: Mapped[Dream] = relationship(
        "Dream", foreign_keys=[target_dream_id], back_populates="incoming_relations"
    )

    # 约束与索引
    __table_args__ = (
        UniqueConstraint(
            "source_dream_id",
            "target_dream_id",
            "relation_type",
            name="uq_dream_relation",
        ),
        Index("idx_dream_relations_source", "source_dream_id"),
        Index("idx_dream_relations_target", "target_dream_id"),
    )

    def __repr__(self) -> str:
        return f"<DreamRelation(source={self.source_dream_id}, target={self.target_dream_id}, type={self.relation_type})>"

"""
梦境向量模型 - dream_embeddings 表 (1:1 关联,独立索引)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamEmbedding(Base):
    """
    梦境向量表 - 存储 embedding 向量用于语义搜索
    与 dreams 表 1:1 关系，独立管理向量索引
    注意: pgvector 扩展和 Vector 列在迁移脚本中通过原生 SQL 创建
    """

    __tablename__ = "dream_embeddings"

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

    # content_embedding 列通过原生 SQL 在迁移脚本中创建 (vector(3072))

    # 向量元数据
    embedding_model: Mapped[str] = mapped_column(String(50), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=shanghai_now
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="embedding")

    def __repr__(self) -> str:
        return f"<DreamEmbedding(id={self.id}, model={self.embedding_model})>"

"""
梦境类型模型 - dream_types 表 + dream_type_mappings 关联表 (M:N)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DreamTypeEnum

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamType(Base):
    """梦境类型字典表"""

    __tablename__ = "dream_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type_name: Mapped[DreamTypeEnum] = mapped_column(
        Enum(DreamTypeEnum, name="dream_type_enum"),
        unique=True,
        nullable=False,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # 统计字段
    usage_count: Mapped[int] = mapped_column(Integer, default=0)

    # ORM 关系
    mappings: Mapped[list[DreamTypeMapping]] = relationship(
        "DreamTypeMapping", back_populates="dream_type", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<DreamType(type_name={self.type_name})>"


class DreamTypeMapping(Base):
    """梦境-类型关联表 (M:N)"""

    __tablename__ = "dream_type_mappings"

    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dream_types.id", ondelete="CASCADE"),
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="type_mappings")
    dream_type: Mapped[DreamType] = relationship(
        "DreamType", back_populates="mappings"
    )

    # 复合索引
    __table_args__ = (Index("idx_type_dream", "type_id", "dream_id"),)

    def __repr__(self) -> str:
        return f"<DreamTypeMapping(dream_id={self.dream_id}, type_id={self.type_id})>"

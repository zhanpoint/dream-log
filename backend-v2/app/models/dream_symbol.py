"""
符号模型 - symbols 表 + dream_symbols 关联表
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
    Integer,
    SmallInteger,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EmotionSource, SymbolCategory
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream import Dream


class Symbol(Base):
    """符号字典表"""

    __tablename__ = "symbols"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    category: Mapped[SymbolCategory] = mapped_column(
        Enum(SymbolCategory, name="symbol_category"), nullable=False
    )

    # 基于认知神经科学的符号分析
    cognitive_meaning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 统计与关联
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_emotion_intensity: Mapped[float | None] = mapped_column(Float, nullable=True)
    common_emotions: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream_symbols: Mapped[list[DreamSymbol]] = relationship(
        "DreamSymbol", back_populates="symbol", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Symbol(name={self.name}, category={self.category})>"


class DreamSymbol(Base):
    """梦境-符号关联表"""

    __tablename__ = "dream_symbols"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("symbols.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 符号在梦中的具体表现
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    intensity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    added_by: Mapped[EmotionSource] = mapped_column(
        Enum(EmotionSource, name="emotion_source", create_type=False),
        default=EmotionSource.AI,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="symbols")
    symbol: Mapped[Symbol] = relationship("Symbol", back_populates="dream_symbols")

    def __repr__(self) -> str:
        return f"<DreamSymbol(dream_id={self.dream_id}, symbol_id={self.symbol_id})>"

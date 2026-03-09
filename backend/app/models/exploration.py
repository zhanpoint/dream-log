"""
梦境探索内容模型
- ExplorationSymbol: 梦境符号词典
- ExplorationArticle: 科学基础/噩梦/改善指南文章
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ExplorationSymbol(Base):
    """梦境符号词典表"""

    __tablename__ = "exploration_symbols"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    search_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("idx_exploration_symbols_category", "category"),
        Index("idx_exploration_symbols_slug", "slug"),
    )

    def __repr__(self) -> str:
        return f"<ExplorationSymbol(slug={self.slug}, name={self.name})>"


class ExplorationArticle(Base):
    """梦境探索文章表（科学基础/噩梦/改善指南）"""

    __tablename__ = "exploration_articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    section: Mapped[str] = mapped_column(String(200), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    __table_args__ = (Index("idx_exploration_articles_module", "module", "order_index"),)

    def __repr__(self) -> str:
        return f"<ExplorationArticle(module={self.module}, section={self.section})>"

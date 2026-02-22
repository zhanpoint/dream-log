"""
标签模型 - tags 表 + dream_tags 关联表
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream import Dream


class Tag(Base):
    """用户自定义标签表"""

    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(20), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream_tags: Mapped[list[DreamTag]] = relationship(
        "DreamTag", back_populates="tag", lazy="noload"
    )

    # 复合唯一约束: 同一用户不能有重名标签
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_user_tag_name"),)

    def __repr__(self) -> str:
        return f"<Tag(name={self.name}, user_id={self.user_id})>"


class DreamTag(Base):
    """梦境-标签关联表 (M:N)"""

    __tablename__ = "dream_tags"

    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="tags")
    tag: Mapped[Tag] = relationship("Tag", back_populates="dream_tags")

    def __repr__(self) -> str:
        return f"<DreamTag(dream_id={self.dream_id}, tag_id={self.tag_id})>"

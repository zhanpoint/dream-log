"""
社区模块模型：Resonance、Comment、CommentLike、UserFollow、Bookmark、Report
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import shanghai_now

if TYPE_CHECKING:
    from app.models.dream import Dream
    from app.models.user import User


class Resonance(Base):
    """共鸣表（等同于点赞，语义化命名）"""

    __tablename__ = "resonances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dream_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))

    __table_args__ = (UniqueConstraint("user_id", "dream_id", name="uq_resonances_user_dream"),)


class Comment(Base):
    """评论/解读表（支持嵌套回复）"""

    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dream_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_interpretation: Mapped[bool] = mapped_column(Boolean, default=False)
    is_adopted: Mapped[bool] = mapped_column(Boolean, default=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    downvote_count: Mapped[int] = mapped_column(Integer, default=0)
    inspire_count: Mapped[int] = mapped_column(Integer, default=0)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    anonymous_alias: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=shanghai_now)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 关联
    replies: Mapped[list[Comment]] = relationship("Comment", foreign_keys=[parent_id], lazy="noload")

    __table_args__ = (
        Index("idx_comments_dream", "dream_id", "created_at"),
        Index("idx_comments_parent", "parent_id"),
    )


class CommentLike(Base):
    """评论赞同/反对/启发表"""

    __tablename__ = "comment_likes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    comment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True)
    reaction_type: Mapped[str] = mapped_column(String(20), default="like")  # 'like' 赞同 | 'downvote' 反对 | 'inspire' 启发
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))


class UserFollow(Base):
    """用户关注关系表"""

    __tablename__ = "user_follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))

    __table_args__ = (
        CheckConstraint("follower_id != following_id", name="chk_no_self_follow"),
        Index("idx_follows_follower", "follower_id"),
        Index("idx_follows_following", "following_id"),
    )


class Bookmark(Base):
    """收藏表"""

    __tablename__ = "bookmarks"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    dream_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dreams.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))


class Report(Base):
    """内容举报表"""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'dream' | 'comment'
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | reviewed | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("timezone('Asia/Shanghai', now())"))

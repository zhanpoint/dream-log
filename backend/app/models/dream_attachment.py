"""
梦境附件模型 - dream_attachments 表
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AttachmentType, StorageBucket

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamAttachment(Base):
    """梦境多媒体附件表"""

    __tablename__ = "dream_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 文件信息
    attachment_type: Mapped[AttachmentType] = mapped_column(
        Enum(AttachmentType, name="attachment_type"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 图像特有
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 音频特有
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 秒
    transcription: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 存储桶
    storage_bucket: Mapped[StorageBucket] = mapped_column(
        Enum(StorageBucket, name="storage_bucket"),
        default=StorageBucket.PRIVATE,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="attachments")

    def __repr__(self) -> str:
        return f"<DreamAttachment(id={self.id}, type={self.attachment_type})>"

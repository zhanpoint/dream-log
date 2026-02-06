"""
Token 黑名单模型
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TokenBlacklist(Base):
    """Token 黑名单模型 - 用于存储已登出的 Token,防止重放攻击"""

    __tablename__ = "token_blacklist"

    # 主键
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Token 信息
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)

    # 时间戳（东八区上海时间）
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    def __repr__(self) -> str:
        return f"<TokenBlacklist(id={self.id}, created_at={self.created_at})>"

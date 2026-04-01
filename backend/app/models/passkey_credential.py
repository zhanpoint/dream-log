"""
Passkey / WebAuthn Credential 模型
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

SHANGHAI_TZ = timezone(timedelta(hours=8))


def shanghai_now() -> datetime:
    return datetime.now(SHANGHAI_TZ)


class PasskeyCredential(Base):
    """一个用户可拥有多个 Passkey。"""

    __tablename__ = "passkey_credentials"

    # WebAuthn credential ID（base64url 字符串）
    id: Mapped[str] = mapped_column(String(512), primary_key=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # credentialPublicKey（二进制）
    public_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    # 签名计数（用于重放/克隆检测；具体策略由 WebAuthn 库处理/返回）
    sign_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # WebAuthn transports（用于 UI/兼容性优化）
    transports: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    # AAGUID（用于展示 provider 名称）
    aaguid: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Backup flags（用于展示是否可同步/已备份）
    backup_eligible: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    backed_up: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # 用户自定义名称（可选）
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=shanghai_now,
        nullable=False,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


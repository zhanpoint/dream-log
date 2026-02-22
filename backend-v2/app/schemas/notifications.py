"""
通知相关 Pydantic Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """通知响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    content: str
    link: str | None = None
    metadata_: dict | None = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """通知列表响应"""

    total: int
    items: list[NotificationResponse]


class UnreadCountResponse(BaseModel):
    """未读数量响应"""

    count: int

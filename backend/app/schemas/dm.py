"""
私信相关 Pydantic 模型
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DmMessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    content_type: str
    media_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DmConversationOut(BaseModel):
    id: uuid.UUID
    initiator_id: uuid.UUID
    recipient_id: uuid.UUID
    status: str  # pending / active / blocked
    source_dream_id: Optional[uuid.UUID] = None
    source_dream_title: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime
    # 对方用户信息
    other_user_id: uuid.UUID
    other_username: Optional[str] = None
    other_avatar: Optional[str] = None
    # 最后一条消息预览
    last_message_preview: Optional[str] = None

    model_config = {"from_attributes": True}


class SendKnockRequest(BaseModel):
    """发送敲门消息请求（仅限纯文本）"""
    content: str = Field(..., min_length=1, max_length=300)
    source_dream_id: Optional[uuid.UUID] = None


class SendMessageRequest(BaseModel):
    """发送普通消息请求（active 状态）"""
    content: str = Field(default="", max_length=2000)
    content_type: str = Field(default="text", pattern="^(text|image|rich)$")
    media_url: Optional[str] = Field(default=None, max_length=2048)


class DmMessageListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[DmMessageOut]
    conversation: DmConversationOut

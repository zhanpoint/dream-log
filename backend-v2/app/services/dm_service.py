"""
一对一私信服务（防骚扰敲门机制）

状态机：
  pending  -> active  （recipient 首次回复）
  pending  -> blocked （recipient 拒绝 / initiator 屏蔽）
  active   -> blocked （任意一方屏蔽）

发消息权限：
  pending：initiator 不可再发（防轰炸）；recipient 发消息即激活
  active：双方自由发消息
  blocked：双方均不可发消息
"""

import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dm import DirectMessage, DmConversation
from app.models.dream import Dream
from app.models.user import User
from app.schemas.dm import (
    DmConversationOut,
    DmMessageListResponse,
    DmMessageOut,
)

logger = logging.getLogger(__name__)


class DmService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_conversation_for_user(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> DmConversation:
        conv = await self.db.get(DmConversation, conversation_id)
        if not conv:
            raise ValueError("会话不存在")
        if user_id not in (conv.initiator_id, conv.recipient_id):
            raise ValueError("无权限访问此会话")
        return conv

    async def get_or_create_conversation(
        self,
        initiator_id: uuid.UUID,
        recipient_id: uuid.UUID,
        source_dream_id: uuid.UUID | None = None,
    ) -> DmConversation:
        """获取或新建会话（每对用户唯一）"""
        if initiator_id == recipient_id:
            raise ValueError("不能给自己发私信")

        stmt = select(DmConversation).where(
            and_(
                DmConversation.initiator_id == initiator_id,
                DmConversation.recipient_id == recipient_id,
            )
        )
        conv = (await self.db.execute(stmt)).scalar_one_or_none()

        if not conv:
            # 也检查反向（recipient 曾主动发过）
            stmt_rev = select(DmConversation).where(
                and_(
                    DmConversation.initiator_id == recipient_id,
                    DmConversation.recipient_id == initiator_id,
                )
            )
            conv = (await self.db.execute(stmt_rev)).scalar_one_or_none()

        if not conv:
            conv = DmConversation(
                initiator_id=initiator_id,
                recipient_id=recipient_id,
                status="pending",
                source_dream_id=source_dream_id,
            )
            self.db.add(conv)
            await self.db.flush()
            await self.db.refresh(conv)

        return conv

    async def send_knock(
        self,
        initiator_id: uuid.UUID,
        recipient_id: uuid.UUID,
        content: str,
        source_dream_id: uuid.UUID | None = None,
    ) -> DmConversation:
        """
        发送敲门消息（首次私信）：
        - 强制 content_type=text（防视觉骚扰）
        - initiator 只能发一次（防轰炸）
        """
        conv = await self.get_or_create_conversation(
            initiator_id, recipient_id, source_dream_id
        )

        if conv.status == "blocked":
            raise ValueError("会话已被屏蔽，无法发送消息")

        # 检查是否已有敲门消息
        existing_knock_stmt = select(func.count()).select_from(
            select(DirectMessage).where(
                DirectMessage.conversation_id == conv.id,
                DirectMessage.sender_id == initiator_id,
            ).subquery()
        )
        knock_count = (await self.db.execute(existing_knock_stmt)).scalar() or 0
        if knock_count > 0 and conv.status == "pending":
            raise ValueError("敲门消息已发出，请等待对方回复")

        msg = DirectMessage(
            conversation_id=conv.id,
            sender_id=initiator_id,
            content=content.strip(),
            content_type="text",  # 敲门消息强制纯文本
        )
        self.db.add(msg)
        await self.db.execute(
            update(DmConversation)
            .where(DmConversation.id == conv.id)
            .values(last_message_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return conv

    async def reply_and_activate(
        self,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        content: str,
        content_type: str = "text",
        media_url: str | None = None,
    ) -> DirectMessage:
        """
        recipient 首次回复：激活会话，解锁双向聊天。
        此后双方均可自由发消息（支持图片/富文本）。
        """
        conv = await self.db.get(DmConversation, conversation_id)
        if not conv:
            raise ValueError("会话不存在")
        if conv.status == "blocked":
            raise ValueError("会话已被屏蔽")
        if sender_id == conv.initiator_id:
            raise ValueError("pending 状态下发起方不可再发消息")

        msg = DirectMessage(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=normalized_content,
            content_type=content_type,
            media_url=media_url,
        )
        self.db.add(msg)
        await self.db.execute(
            update(DmConversation)
            .where(DmConversation.id == conversation_id)
            .values(status="active", last_message_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def send_message(
        self,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        content: str,
        content_type: str = "text",
        media_url: str | None = None,
    ) -> DirectMessage:
        """active 状态下双方自由发消息"""
        normalized_content = content.strip()
        if content_type == "image":
            if not media_url:
                raise ValueError("图片消息缺少 media_url")
        elif not normalized_content:
            raise ValueError("消息内容不能为空")

        conv = await self.db.get(DmConversation, conversation_id)
        if not conv:
            raise ValueError("会话不存在")

        if conv.status == "blocked":
            raise ValueError("会话已被屏蔽")
        if conv.status == "pending":
            # pending 时 recipient 回复自动激活
            if sender_id == conv.initiator_id:
                raise ValueError("等待对方回复中，暂不能再发消息")
            return await self.reply_and_activate(
                conversation_id,
                sender_id,
                normalized_content,
                content_type,
                media_url=media_url,
            )

        if sender_id not in (conv.initiator_id, conv.recipient_id):
            raise ValueError("无权限发送消息")

        msg = DirectMessage(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content.strip(),
            content_type=content_type,
            media_url=media_url,
        )
        self.db.add(msg)
        await self.db.execute(
            update(DmConversation)
            .where(DmConversation.id == conversation_id)
            .values(last_message_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def block_conversation(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """拒绝/屏蔽会话（initiator 或 recipient 均可操作）"""
        conv = await self.db.get(DmConversation, conversation_id)
        if not conv:
            return False
        if user_id not in (conv.initiator_id, conv.recipient_id):
            return False
        await self.db.execute(
            update(DmConversation)
            .where(DmConversation.id == conversation_id)
            .values(status="blocked")
        )
        await self.db.flush()
        return True

    async def get_conversations(self, user_id: uuid.UUID) -> list[DmConversationOut]:
        """获取用户所有会话列表（按最后消息时间倒序）"""
        from sqlalchemy import or_
        stmt = (
            select(DmConversation)
            .where(
                or_(
                    DmConversation.initiator_id == user_id,
                    DmConversation.recipient_id == user_id,
                )
            )
            .order_by(DmConversation.last_message_at.desc().nullslast())
        )
        convs = (await self.db.execute(stmt)).scalars().all()

        result = []
        for conv in convs:
            other_id = conv.recipient_id if conv.initiator_id == user_id else conv.initiator_id
            other_user = await self.db.get(User, other_id)

            # 最后一条消息预览
            last_msg_stmt = (
                select(DirectMessage)
                .where(DirectMessage.conversation_id == conv.id)
                .order_by(DirectMessage.created_at.desc())
                .limit(1)
            )
            last_msg = (await self.db.execute(last_msg_stmt)).scalar_one_or_none()

            # 来源梦境标题
            source_dream_title = None
            if conv.source_dream_id:
                source_dream = await self.db.get(Dream, conv.source_dream_id)
                if source_dream:
                    source_dream_title = source_dream.title

            result.append(DmConversationOut(
                id=conv.id,
                initiator_id=conv.initiator_id,
                recipient_id=conv.recipient_id,
                status=conv.status,
                source_dream_id=conv.source_dream_id,
                source_dream_title=source_dream_title,
                last_message_at=conv.last_message_at,
                created_at=conv.created_at,
                other_user_id=other_id,
                other_username=other_user.username if other_user else None,
                other_avatar=other_user.avatar if other_user else None,
                last_message_preview=(last_msg.content[:50] if last_msg else None),
            ))

        return result

    async def get_messages(
        self,
        conversation_id: uuid.UUID,
        requester_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
    ) -> DmMessageListResponse:
        """分页获取消息历史。"""
        conv = await self.db.get(DmConversation, conversation_id)
        if not conv:
            raise ValueError("会话不存在")
        if requester_id not in (conv.initiator_id, conv.recipient_id):
            raise ValueError("无权限查看此会话")

        total_stmt = select(func.count()).where(DirectMessage.conversation_id == conversation_id)
        total = (await self.db.execute(total_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        msgs_stmt = (
            select(DirectMessage)
            .where(DirectMessage.conversation_id == conversation_id)
            .order_by(DirectMessage.created_at)
            .offset(offset)
            .limit(page_size)
        )
        msgs = (await self.db.execute(msgs_stmt)).scalars().all()

        items = [
            DmMessageOut(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                content=m.content,
                content_type=m.content_type,
                media_url=m.media_url,
                created_at=m.created_at,
            )
            for m in msgs
        ]

        # 构建会话信息（同时附带来源梦境标题）
        other_id = conv.recipient_id if conv.initiator_id == requester_id else conv.initiator_id
        other_user = await self.db.get(User, other_id)
        source_dream_title = None
        if conv.source_dream_id:
            source_dream = await self.db.get(Dream, conv.source_dream_id)
            if source_dream:
                source_dream_title = source_dream.title

        conv_out = DmConversationOut(
            id=conv.id,
            initiator_id=conv.initiator_id,
            recipient_id=conv.recipient_id,
            status=conv.status,
            source_dream_id=conv.source_dream_id,
            source_dream_title=source_dream_title,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            other_user_id=other_id,
            other_username=other_user.username if other_user else None,
            other_avatar=other_user.avatar if other_user else None,
            last_message_preview=items[-1].content[:50] if items else None,
        )

        return DmMessageListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=items,
            conversation=conv_out,
        )


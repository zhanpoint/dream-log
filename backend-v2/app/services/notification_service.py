"""
通知服务
"""

import logging
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.sse_manager import sse_manager
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


class NotificationService:
    """通知服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        type_: NotificationType,
        title: str,
        content: str,
        link: str | None = None,
        metadata: dict | None = None,
    ) -> Notification:
        """创建通知并通过 SSE 实时推送"""
        notification = Notification(
            user_id=user_id,
            type=type_,
            title=title,
            content=content,
            link=link,
            metadata_=metadata,
        )
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)

        # 通过 SSE 推送通知
        await self._push_notification(notification)

        return notification

    async def _push_notification(self, notification: Notification) -> None:
        """通过 SSE 推送通知给用户"""
        try:
            notification_data = {
                "id": str(notification.id),
                "type": notification.type.value,
                "title": notification.title,
                "content": notification.content,
                "link": notification.link,
                "metadata_": notification.metadata_,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            }

            sent_count = await sse_manager.send_to_user(
                notification.user_id, "notification", notification_data
            )

            if sent_count > 0:
                logger.info(
                    f"SSE 推送成功: notification_id={notification.id}, "
                    f"user_id={notification.user_id}, connections={sent_count}"
                )
            else:
                logger.debug(
                    f"用户离线，未推送: notification_id={notification.id}, "
                    f"user_id={notification.user_id}"
                )
        except Exception as e:
            logger.error(f"SSE 推送失败: {e}", exc_info=True)

    async def get_list(
        self,
        user_id: uuid.UUID,
        *,
        type_filter: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        """获取通知列表"""
        base = select(Notification).where(Notification.user_id == user_id)

        if type_filter:
            base = base.where(Notification.type == type_filter)

        total = (
            await self.db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0

        stmt = base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """获取未读数量"""
        stmt = select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        return (await self.db.execute(stmt)).scalar() or 0

    async def mark_as_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """标记单条已读"""
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        """标记全部已读"""
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    async def delete(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """删除通知"""
        stmt = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            return False
        await self.db.delete(notification)
        await self.db.commit()
        return True

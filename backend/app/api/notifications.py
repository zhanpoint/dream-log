"""
通知 API 路由
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_current_user_optional_token, get_db
from app.core.sse_manager import sse_event_generator, sse_manager
from app.models.user import User
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["通知"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    type: str | None = Query(None, description="通知类型过滤"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> NotificationListResponse:
    """获取通知列表"""
    service = NotificationService(db)
    items, total = await service.get_list(
        current_user.id, type_filter=type, limit=limit, offset=offset
    )
    return NotificationListResponse(
        total=total,
        items=[
            NotificationResponse(
                id=n.id,
                type=n.type.value,
                title=n.title,
                content=n.content,
                link=n.link,
                metadata_=n.metadata_,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in items
        ],
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UnreadCountResponse:
    """获取未读数量"""
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """标记已读"""
    service = NotificationService(db)
    ok = await service.mark_as_read(notification_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知不存在")
    return {"message": "已标记为已读"}


@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """全部标记已读"""
    service = NotificationService(db)
    count = await service.mark_all_as_read(current_user.id)
    return {"marked": count}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除通知"""
    service = NotificationService(db)
    ok = await service.delete(notification_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知不存在")


@router.get("/stream")
async def notification_stream(
    request: Request,
    # SSE 客户端（尤其是 EventSource）不方便设置自定义 Authorization header。
    # 这里同时支持：
    # - Authorization: Bearer <token>
    # - /stream?token=<token>
    current_user: User = Depends(get_current_user_optional_token),
) -> StreamingResponse:
    """
    SSE 通知推送流

    客户端通过此端点建立 SSE 连接，实时接收通知推送
    """
    # 开发环境下的防护：避免线上站点/其它来源误连到本机 localhost:8000
    # 由于 CORS 在网络层之后才生效，误连依然会打到后端并刷日志；这里直接按 Origin 拒绝。
    if settings.is_development:
        origin = request.headers.get("origin")
        if origin and not origin.startswith(("http://localhost", "http://127.0.0.1")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden origin for SSE in development",
            )

    queue = await sse_manager.connect(current_user.id)

    return StreamingResponse(
        sse_event_generator(request, current_user.id, queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        },
    )

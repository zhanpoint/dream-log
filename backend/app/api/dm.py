"""
一对一私信 REST API
"""

import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.dm import (
    DmConversationOut,
    DmMessageListResponse,
    DmMessageOut,
    SendKnockRequest,
    SendMessageRequest,
)
from app.models.dm import DirectMessage
from app.services.dm_service import DmService
from app.services.dm_ws_manager import manager as dm_ws_manager
from app.services.oss_service import get_oss_service
from app.services.token_service import TokenService
from app.services.user_service import UserService

router = APIRouter(prefix="/dm", tags=["私信"])
logger = logging.getLogger(__name__)

_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def _build_message_out(msg, signed_media_url: str | None = None) -> DmMessageOut:
    return DmMessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        content_type=msg.content_type,
        media_url=signed_media_url or msg.media_url,
        created_at=msg.created_at,
    )


async def _get_ws_user(websocket: WebSocket, db: AsyncSession) -> User:
    token = websocket.query_params.get("token")
    if not token:
        raise ValueError("缺少 token")

    try:
        payload = TokenService.verify_token(token, token_type="access")
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("无效 token")
    except ValueError as e:
        raise ValueError("令牌验证失败") from e

    user = await UserService(db).get_by_id(user_id)
    if not user:
        raise ValueError("用户不存在")
    return user


@router.websocket("/conversations/{conversation_id}/ws")
async def dm_conversation_ws(websocket: WebSocket, conversation_id: uuid.UUID):
    user_id: uuid.UUID | None = None

    async with async_session_maker() as db:
        try:
            user = await _get_ws_user(websocket, db)
            user_id = user.id

            svc = DmService(db)
            await svc.get_conversation_for_user(conversation_id, user.id)

            await dm_ws_manager.connect(conversation_id, user.id, websocket)
            await websocket.send_json({"type": "connected", "conversation_id": str(conversation_id)})

            while True:
                # 当前仅用于下行推送；接收数据仅用于保持连接与探活
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        except ValueError as e:
            await websocket.close(code=1008, reason=str(e))
        except Exception:
            logger.exception("私聊 WebSocket 连接异常")
            try:
                await websocket.close(code=1011, reason="ws internal error")
            except Exception:
                pass
        finally:
            if user_id is not None:
                await dm_ws_manager.disconnect(conversation_id, user_id, websocket)


# ── 会话列表 ────────────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=list[DmConversationOut], summary="我的会话列表")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DmService(db)
    return await svc.get_conversations(current_user.id)


# ── 发送敲门消息（新建会话） ──────────────────────────────────────────────────────

@router.post(
    "/conversations/knock/{recipient_id}",
    response_model=DmConversationOut,
    status_code=201,
    summary="发送敲门消息（发起私信）",
)
async def send_knock(
    recipient_id: uuid.UUID,
    data: SendKnockRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    向目标用户发送首条"敲门消息"（仅限纯文本）。
    对方回复后会话才正式激活。
    """
    svc = DmService(db)
    try:
        conv = await svc.send_knock(
            initiator_id=current_user.id,
            recipient_id=recipient_id,
            content=data.content,
            source_dream_id=data.source_dream_id,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 发送通知（仅首次敲门推送一次）
    try:
        from app.models.notification import NotificationType
        from app.services.notification_service import NotificationService

        notif_svc = NotificationService(db)
        knock_count = len([m for m in conv.messages]) if hasattr(conv, "messages") else 1
        if knock_count <= 1:
            await notif_svc.create(
                user_id=recipient_id,
                type_=NotificationType.COMMENT,  # 复用现有通知类型
                title="有人敲门，来自梦境广场",
                content=f"{current_user.username or '某人'} 向你发送了私信：{data.content[:30]}...",
                link="/community/messages",
                metadata={"sender_id": str(current_user.id)},
            )
            await db.commit()
    except Exception as e:
        logger.warning("私信通知发送失败: %s", e)

    # 返回会话信息
    from app.models.user import User as UserModel

    recipient_user = await db.get(UserModel, recipient_id)
    return DmConversationOut(
        id=conv.id,
        initiator_id=conv.initiator_id,
        recipient_id=conv.recipient_id,
        status=conv.status,
        source_dream_id=conv.source_dream_id,
        source_dream_title=None,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        other_user_id=recipient_id,
        other_username=recipient_user.username if recipient_user else None,
        other_avatar=recipient_user.avatar if recipient_user else None,
        last_message_preview=data.content[:50],
    )


# ── 上传私聊图片（私有桶） ───────────────────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/images",
    summary="上传私聊图片到 OSS 私有桶",
)
async def upload_dm_image(
    conversation_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DmService(db)
    try:
        conv = await svc.get_conversation_for_user(conversation_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

    if conv.status == "blocked":
        raise HTTPException(status_code=400, detail="会话已被屏蔽")
    if conv.status == "pending" and current_user.id == conv.initiator_id:
        raise HTTPException(status_code=400, detail="等待对方回复中，暂不能发送图片")

    if file.content_type not in _IMAGE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="仅支持 jpg/png/webp/gif 图片")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="图片不能为空")
    if len(raw) > _MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="图片大小不能超过 10MB")

    try:
        oss = get_oss_service()
        uploaded = await oss.upload_private_image(
            conversation_id=str(conversation_id),
            filename=file.filename,
            content=raw,
        )
        signed_url = await oss.sign_private_object_url(uploaded.object_key, expires_seconds=3600)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("私聊图片上传失败")
        raise HTTPException(status_code=500, detail=f"上传失败: {e}")

    return {
        "object_key": uploaded.object_key,
        "signed_url": signed_url,
        "content_type": uploaded.content_type,
        "size": uploaded.size,
    }


# ── 消息历史 ────────────────────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=DmMessageListResponse,
    summary="会话消息历史",
)
async def get_messages(
    conversation_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DmService(db)
    try:
        result = await svc.get_messages(conversation_id, current_user.id, page=page, page_size=page_size)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

    # 私有桶图片转签名 URL（短期有效）
    try:
        oss = get_oss_service()
        for item in result.items:
            if item.content_type == "image" and item.media_url:
                item.media_url = await oss.sign_private_object_url(item.media_url, expires_seconds=3600)
    except Exception as e:
        logger.warning("私聊图片签名失败: %s", e)

    await db.commit()
    return result


# ── 发送消息 ────────────────────────────────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=DmMessageOut,
    status_code=201,
    summary="在会话中发送消息",
)
async def send_message(
    conversation_id: uuid.UUID,
    data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.content_type == "image" and not data.media_url:
        raise HTTPException(status_code=400, detail="图片消息缺少 media_url")

    svc = DmService(db)
    try:
        msg = await svc.send_message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=data.content,
            content_type=data.content_type,
            media_url=data.media_url,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    signed_media_url = None
    if msg.content_type == "image" and msg.media_url:
        try:
            signed_media_url = await get_oss_service().sign_private_object_url(msg.media_url, expires_seconds=3600)
        except Exception as e:
            logger.warning("发送后图片签名失败: %s", e)

    msg_out = _build_message_out(msg, signed_media_url=signed_media_url)

    # WebSocket 实时推送（失败不影响主流程）
    try:
        await dm_ws_manager.broadcast(
            conversation_id,
            {
                "type": "message:new",
                "conversation_id": str(conversation_id),
                "message": {
                    "id": str(msg_out.id),
                    "conversation_id": str(msg_out.conversation_id),
                    "sender_id": str(msg_out.sender_id),
                    "content": msg_out.content,
                    "content_type": msg_out.content_type,
                    "media_url": msg_out.media_url,
                    "created_at": msg_out.created_at.isoformat(),
                },
            },
        )
    except Exception as e:
        logger.warning("私聊 WS 推送失败: %s", e)

    # active 状态下发通知
    try:
        conv = await svc.get_conversation_for_user(conversation_id, current_user.id)
        if conv and conv.status == "active":
            other_id = conv.recipient_id if current_user.id == conv.initiator_id else conv.initiator_id
            from app.models.notification import NotificationType
            from app.services.notification_service import NotificationService

            notif_svc = NotificationService(db)
            preview = "[图片]" if data.content_type == "image" else data.content[:50]
            await notif_svc.create(
                user_id=other_id,
                type_=NotificationType.COMMENT,
                title=f"{current_user.username or '某人'} 给你发了私信",
                content=preview,
                link=f"/community/messages/{conversation_id}",
                metadata={"sender_id": str(current_user.id), "conversation_id": str(conversation_id)},
            )
            await db.commit()
    except Exception as e:
        logger.warning("私信通知发送失败: %s", e)

    return msg_out


@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/refresh-media-url",
    summary="刷新私聊图片签名 URL",
)
async def refresh_dm_image_url(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DmService(db)
    try:
        await svc.get_conversation_for_user(conversation_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

    stmt = select(DirectMessage).where(
        DirectMessage.id == message_id,
        DirectMessage.conversation_id == conversation_id,
    )
    msg = (await db.execute(stmt)).scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
    if msg.content_type != "image" or not msg.media_url:
        raise HTTPException(status_code=400, detail="该消息不是图片消息")

    try:
        signed_url = await get_oss_service().sign_private_object_url(msg.media_url, expires_seconds=3600)
    except Exception as e:
        logger.exception("刷新私聊图片签名失败")
        raise HTTPException(status_code=500, detail=f"刷新失败: {e}")

    return {
        "message_id": str(msg.id),
        "media_url": signed_url,
    }


# ── 屏蔽/拒绝 ───────────────────────────────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/block",
    summary="屏蔽/拒绝会话",
)
async def block_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DmService(db)
    ok = await svc.block_conversation(conversation_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="会话不存在或无权限")
    await db.commit()
    return {"blocked": True}

"""
梦境 CRUD API 路由
"""

from datetime import date
from uuid import UUID

from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, Query, Request, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_arq_redis, get_current_user, get_current_user_optional_token, get_db
from app.core.sse_manager import sse_event_generator, sse_manager
from app.models.user import User
from app.schemas.dreams import (
    AddReflectionAnswerRequest,
    AttachmentResponse,
    AnalysisStatusResponse,
    CreateDreamRequest,
    CreateTagRequest,
    DreamDetailResponse,
    DreamListItem,
    DreamListResponse,
    DreamStatsResponse,
    GenerateTitleRequest,
    TagResponse,
    TriggerResponse,
    UpdateDreamRequest,
    UpdateTagRequest,
)
from app.services.community_service import CommunityService
from app.services.dream_service import DreamService

router = APIRouter(prefix="/dreams", tags=["梦境"])


def _build_list_item(dream) -> DreamListItem:
    """将 Dream ORM 对象转为列表项"""
    return DreamListItem(
        id=dream.id,
        user_id=dream.user_id,
        title=dream.title,
        title_generated_by_ai=dream.title_generated_by_ai,
        dream_date=dream.dream_date,
        dream_time=dream.dream_time,
        content_preview=dream.content[:100] if dream.content else "",
        primary_emotion=dream.primary_emotion,
        emotion_intensity=dream.emotion_intensity,
        lucidity_level=dream.lucidity_level,
        vividness_level=dream.vividness_level,
        ai_processed=dream.ai_processed,
        ai_processing_status=dream.ai_processing_status.value if dream.ai_processing_status else "PENDING",
        is_favorite=dream.is_favorite,
        is_draft=dream.is_draft,
        privacy_level=dream.privacy_level.value if dream.privacy_level else "PRIVATE",
        view_count=dream.view_count,
        created_at=dream.created_at,
        dream_types=[
            m.dream_type.type_name.value
            for m in dream.type_mappings
            if m.dream_type
        ],
        tags=[
            TagResponse(id=dt.tag.id, name=dt.tag.name)
            for dt in dream.tags
            if dt.tag
        ],
        attachments_count=len(dream.attachments) if dream.attachments else 0,
    )


def _build_detail(dream) -> DreamDetailResponse:
    """将 Dream ORM 对象转为详情响应"""
    insight = dream.insight

    return DreamDetailResponse(
        id=dream.id,
        user_id=dream.user_id,
        title=dream.title,
        title_generated_by_ai=dream.title_generated_by_ai,
        is_draft=dream.is_draft,
        dream_date=dream.dream_date,
        dream_time=dream.dream_time,
        content=dream.content,
        completeness_score=dream.completeness_score,
        is_nap=dream.is_nap,
        # 睡眠
        sleep_start_time=dream.sleep_start_time,
        awakening_time=dream.awakening_time,
        sleep_duration_minutes=dream.sleep_duration_minutes,
        awakening_state=dream.awakening_state.value if dream.awakening_state else None,
        sleep_quality=dream.sleep_quality,
        sleep_fragmented=dream.sleep_fragmented,
        sleep_depth=dream.sleep_depth,
        # 情绪
        primary_emotion=dream.primary_emotion,
        emotion_intensity=dream.emotion_intensity,
        emotion_residual=dream.emotion_residual,
        # 触发因素
        triggers=[
            TriggerResponse(name=t.trigger_name, confidence=t.confidence, reasoning=t.reasoning)
            for t in dream.trigger_mappings
        ],
        # 特征
        lucidity_level=dream.lucidity_level,
        vividness_level=dream.vividness_level,
        # 现实关联
        reality_correlation=dream.reality_correlation,
        # AI
        ai_processed=dream.ai_processed,
        ai_processing_status=dream.ai_processing_status.value if dream.ai_processing_status else "PENDING",
        ai_processed_at=dream.ai_processed_at,
        ai_image_url=dream.ai_image_url,
        # 洞察
        life_context=insight.life_context if insight else None,
        user_interpretation=insight.user_interpretation if insight else None,
        content_structured=insight.content_structured if insight else None,
        ai_analysis=insight.ai_analysis if insight else None,
        reflection_answers=insight.reflection_answers if insight else None,
        # 元数据
        privacy_level=dream.privacy_level.value if dream.privacy_level else "PRIVATE",
        is_favorite=dream.is_favorite,
        view_count=dream.view_count,
        parent_dream_id=dream.parent_dream_id,
        # 关联
        dream_types=[
            m.dream_type.type_name.value
            for m in dream.type_mappings
            if m.dream_type
        ],
        tags=[
            TagResponse(id=dt.tag.id, name=dt.tag.name)
            for dt in dream.tags
            if dt.tag
        ],
        attachments_count=len(dream.attachments) if dream.attachments else 0,
        attachments=[
            AttachmentResponse(
                id=att.id,
                attachment_type=att.attachment_type.value,
                file_url=att.file_url,
                thumbnail_url=att.thumbnail_url,
                mime_type=att.mime_type,
                duration=att.duration,
            )
            for att in (dream.attachments or [])
        ],
        # 时间
        created_at=dream.created_at,
        updated_at=dream.updated_at,
    )


# ============= API 路由 =============


@router.post("", response_model=DreamDetailResponse, status_code=201)
async def create_dream(
    request: CreateDreamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DreamDetailResponse:
    """创建梦境 (不自动触发 AI 分析，需手动调用 /analyze)"""
    service = DreamService(db)
    dream = await service.create_dream(request, current_user.id)

    # 创建后自动刷新精选快照（公开梦境）
    if dream.privacy_level and dream.privacy_level.value == "PUBLIC":
        await CommunityService(db).refresh_featured_snapshot(dream.id)
        await db.commit()

    # 重新查询以加载关联数据
    dream = await service.get_dream(dream.id, current_user.id)
    return _build_detail(dream)


@router.get("", response_model=DreamListResponse)
async def list_dreams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("dream_date", pattern="^(dream_date|created_at|vividness_level)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    dream_type: str | None = None,
    emotion: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    is_favorite: bool | None = None,
) -> DreamListResponse:
    """获取梦境列表 (分页/过滤/排序)"""
    service = DreamService(db)
    dreams, total = await service.list_dreams(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        dream_type=dream_type,
        emotion=emotion,
        date_from=date_from,
        date_to=date_to,
        search=search,
        is_favorite=is_favorite,
    )

    return DreamListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_build_list_item(d) for d in dreams],
    )


@router.get("/stats", response_model=DreamStatsResponse)
async def get_dream_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DreamStatsResponse:
    """获取梦境统计：全部数量、连续记录天数、本周/本月记录数"""
    service = DreamService(db)
    data = await service.get_dream_stats(current_user.id)
    return DreamStatsResponse(**data)


@router.get("/{dream_id}", response_model=DreamDetailResponse)
async def get_dream(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DreamDetailResponse:
    """获取梦境详情"""
    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)
    return _build_detail(dream)


@router.patch("/{dream_id}", response_model=DreamDetailResponse)
async def update_dream(
    dream_id: UUID,
    request: UpdateDreamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DreamDetailResponse:
    """更新梦境"""
    service = DreamService(db)
    await service.update_dream(dream_id, current_user.id, request)

    # 更新后自动刷新精选快照（公开梦境）
    dream = await service.get_dream(dream_id, current_user.id)
    if dream.privacy_level and dream.privacy_level.value == "PUBLIC":
        await CommunityService(db).refresh_featured_snapshot(dream_id)
        await db.commit()

    # 重新查询以加载关联数据
    dream = await service.get_dream(dream_id, current_user.id)
    return _build_detail(dream)


@router.delete("/{dream_id}", status_code=204)
async def delete_dream(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """软删除梦境"""
    service = DreamService(db)
    await service.delete_dream(dream_id, current_user.id)


@router.post("/{dream_id}/favorite")
async def toggle_favorite(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """切换收藏"""
    service = DreamService(db)
    is_fav = await service.toggle_favorite(dream_id, current_user.id)
    return {"is_favorite": is_fav}


@router.post("/{dream_id}/view")
async def increment_view_count(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """记录一次有效浏览"""
    service = DreamService(db)
    view_count = await service.increment_view_count(dream_id, current_user.id)
    return {"view_count": view_count}


@router.post("/generate-title")
async def generate_title_standalone(
    body: GenerateTitleRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """独立生成标题（不依赖梦境 ID，用于创建/编辑梦境时实时生成）"""
    from app.services.ai_service import ai_service, get_target_language_from_locale

    # 从请求头推断目标语言（由前端 Axios 拦截器注入 Accept-Language）
    accept_language = http_request.headers.get("Accept-Language")
    target_language = get_target_language_from_locale(accept_language)

    title = await ai_service.generate_title(
        content=body.content,
        target_language=target_language,
    )
    return {"title": title}


@router.post("/{dream_id}/analyze")
async def trigger_analysis(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq: ArqRedis = Depends(get_arq_redis),
    accept_language: str | None = Header(None, alias="Accept-Language"),
) -> dict[str, str]:
    """手动触发 AI 分析（支持多次重新分析）"""
    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)

    from app.models.enums import AIProcessingStatus

    # 若已在队列/处理中，默认直接返回，避免重复 enqueue（多标签页/重试/连点）
    # 但如果锁不存在，说明可能是异常中断导致状态卡住，允许重新触发
    lock_key = f"ai:lock:dream-analysis:{dream_id}"
    if dream.ai_processing_status in (AIProcessingStatus.PENDING, AIProcessingStatus.PROCESSING):
        try:
            lock_exists = bool(await arq.exists(lock_key))
        except Exception:
            lock_exists = True
        if lock_exists:
            return {"message": "AI 分析已在进行中", "status": dream.ai_processing_status.value}

    # 去重锁：避免用户连点/多标签页导致重复 enqueue（TTL 覆盖一次分析周期）
    try:
        acquired = await arq.set(lock_key, "1", ex=180, nx=True)
    except Exception:
        acquired = True
    if not acquired:
        return {"message": "AI 分析已在进行中", "status": "PROCESSING"}

    dream.ai_processing_status = AIProcessingStatus.PENDING
    dream.ai_processed = False
    await db.commit()

    # 清理旧的取消标记（避免上一次取消影响本次重新分析）
    try:
        await arq.delete(f"ai:cancel:dream-analysis:{dream_id}")
    except Exception:
        pass

    # 将前端当前语言一并传入任务，保证 AI 输出语言与界面一致
    await arq.enqueue_job("analyze_dream", str(dream.id), accept_language)
    return {"message": "AI 分析已加入队列", "status": "PENDING"}


@router.post("/{dream_id}/reflection-answers", response_model=DreamDetailResponse)
async def add_reflection_answer(
    dream_id: UUID,
    body: AddReflectionAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DreamDetailResponse:
    """添加一条对反思问题的回答，并返回最新详情"""
    service = DreamService(db)
    dream = await service.add_reflection_answer(
        dream_id,
        current_user.id,
        question=body.question,
        answer=body.answer,
    )
    return _build_detail(dream)


@router.get("/{dream_id}/analysis-stream")
async def dream_analysis_stream(
    dream_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user_optional_token),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """SSE 流：实时推送梦境分析状态更新（支持 query 参数 token）"""
    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)

    queue = await sse_manager.connect(current_user.id)

    return StreamingResponse(
        sse_event_generator(request, current_user.id, queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{dream_id}/analysis-status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisStatusResponse:
    """查询 AI 分析状态"""
    service = DreamService(db)
    data = await service.get_analysis_status(dream_id, current_user.id)
    return AnalysisStatusResponse(
        dream_id=data["dream_id"],
        ai_processed=data["ai_processed"],
        ai_processing_status=data["ai_processing_status"],
        ai_processed_at=data["ai_processed_at"],
        tasks=data["tasks"],
    )


@router.post("/{dream_id}/analysis-cancel")
async def cancel_analysis(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq: ArqRedis = Depends(get_arq_redis),
) -> dict[str, str]:
    """取消 AI 分析（尽快停止任务流程）"""
    from app.models.enums import AIProcessingStatus

    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)

    await arq.set(f"ai:cancel:dream-analysis:{dream_id}", "1", ex=600)

    dream.ai_processing_status = AIProcessingStatus.FAILED
    await db.commit()
    return {"status": "CANCELLED"}


@router.post("/{dream_id}/generate-image")
async def generate_dream_image(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq: ArqRedis = Depends(get_arq_redis),
) -> dict[str, str]:
    """使用 AI 根据梦境内容生成一张梦境图像，上传至 OSS，
    删除旧图像，将新 URL 持久化到数据库，并返回新 URL。
    """
    from fastapi import HTTPException
    from app.services.ai_service import ai_service
    from app.services.oss_service import get_oss_service

    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)

    try:
        cancel_key = f"ai:cancel:dream-image:{dream_id}"
        try:
            await arq.delete(cancel_key)
        except Exception:
            pass

        async def _cancelled() -> bool:
            try:
                return bool(await arq.get(cancel_key))
            except Exception:
                return False

        new_image_url = await ai_service.generate_dream_image(
            dream_content=dream.content or "",
            dream_title=dream.title,
            user_id=current_user.id,
            dream_id=dream_id,
            cancelled=_cancelled,
        )
    except Exception as e:
        msg = str(e)
        if "已取消" in msg or "canceled" in msg.lower():
            raise HTTPException(status_code=409, detail="图像生成已取消")
        raise HTTPException(status_code=500, detail=f"图像生成失败: {msg}")

    # 删除旧 OSS 文件（AI 图像存储在 public bucket）
    old_url = dream.ai_image_url
    if old_url:
        try:
            await get_oss_service().delete_object_by_url(old_url, bucket_type="public")
        except Exception:
            pass  # 删除失败不阻断流程

    # 将新 URL 持久化到数据库
    dream.ai_image_url = new_image_url
    await db.commit()

    return {"image_url": new_image_url}


@router.post("/{dream_id}/generate-image-cancel")
async def cancel_generate_image(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    arq: ArqRedis = Depends(get_arq_redis),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """取消 AI 图像生成（尽快停止任务流程）"""
    service = DreamService(db)
    await service.get_dream(dream_id, current_user.id)

    await arq.set(f"ai:cancel:dream-image:{dream_id}", "1", ex=600)
    return {"status": "CANCELLED"}


@router.get("/{dream_id}/similar", response_model=list[DreamListItem])
async def get_similar_dreams(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DreamListItem]:
    """获取相似梦境推荐"""
    from sqlalchemy import select
    from app.models.dream import Dream
    from app.models.dream_relation import DreamRelation
    from app.models.enums import RelationType
    
    service = DreamService(db)
    # 验证梦境存在且属于当前用户
    await service.get_dream(dream_id, current_user.id)
    
    # 查询相似梦境关联
    stmt = (
        select(DreamRelation)
        .where(
            DreamRelation.source_dream_id == dream_id,
            DreamRelation.relation_type == RelationType.SIMILAR,
        )
        .order_by(DreamRelation.similarity_score.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    relations = result.scalars().all()
    
    if not relations:
        return []
    
    # 获取目标梦境（含关联数据，供 _build_list_item 使用）
    from sqlalchemy.orm import selectinload
    from app.models.dream_tag import DreamTag, Tag
    from app.models.dream_type import DreamTypeMapping, DreamType
    target_ids = [r.target_dream_id for r in relations]
    # 保持与 relations 相同的相似度排序
    id_to_score = {r.target_dream_id: r.similarity_score for r in relations}
    stmt = (
        select(Dream)
        .options(
            selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),
            selectinload(Dream.tags).selectinload(DreamTag.tag),
            selectinload(Dream.attachments),
        )
        .where(
            Dream.id.in_(target_ids),
            Dream.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    dreams = list(result.scalars().unique().all())
    dreams.sort(key=lambda d: id_to_score.get(d.id, 0), reverse=True)
    
    return [_build_list_item(d) for d in dreams]


# ============= 标签 API =============

tag_router = APIRouter(prefix="/tags", tags=["标签"])


@tag_router.get("", response_model=list[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TagResponse]:
    """获取用户所有标签"""
    service = DreamService(db)
    tags = await service.get_user_tags(current_user.id)
    return [TagResponse(id=t.id, name=t.name) for t in tags]


@tag_router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    request: CreateTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TagResponse:
    """创建标签"""
    service = DreamService(db)
    tag = await service.create_tag(current_user.id, request)
    return TagResponse(id=tag.id, name=tag.name)


@tag_router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    request: UpdateTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TagResponse:
    """更新标签"""
    service = DreamService(db)
    tag = await service.update_tag(tag_id, current_user.id, request)
    return TagResponse(id=tag.id, name=tag.name)


@tag_router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除标签"""
    service = DreamService(db)
    await service.delete_tag(tag_id, current_user.id)


@router.post("/{dream_id}/tags/{tag_id}", status_code=201)
async def add_tag_to_dream(
    dream_id: UUID,
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """给梦境添加标签"""
    service = DreamService(db)
    await service.add_tag_to_dream(dream_id, tag_id, current_user.id)
    return {"message": "标签已添加"}


@router.delete("/{dream_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_dream(
    dream_id: UUID,
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """移除梦境标签"""
    service = DreamService(db)
    await service.remove_tag_from_dream(dream_id, tag_id, current_user.id)


# ============= 附件 API =============


@router.post("/{dream_id}/attachments/presign")
async def get_attachment_upload_url(
    dream_id: UUID,
    filename: str = Query(..., description="文件名"),
    content_type: str = Query("image/jpeg", description="MIME 类型"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取附件预签名上传 URL"""
    service = DreamService(db)
    await service.get_dream(dream_id, current_user.id)  # 验证归属

    from app.services.oss_service import get_oss_service

    # 按类型分目录
    category = "audio" if content_type.startswith("audio/") else "images"
    oss = get_oss_service()
    result = await oss.generate_attachment_upload_signature(
        dream_id=dream_id,
        filename=filename,
        content_type=content_type,
        category=category,
    )
    return result


@router.post("/{dream_id}/attachments", status_code=201)
async def create_attachment(
    dream_id: UUID,
    file_url: str = Query(...),
    attachment_type: str = Query(..., pattern="^(IMAGE|AUDIO|VIDEO)$"),
    file_size: int | None = Query(None),
    mime_type: str | None = Query(None),
    duration: int | None = Query(None, description="音频时长(秒)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """创建附件记录 (前端上传完成后调用)"""
    service = DreamService(db)
    att = await service.create_attachment(
        dream_id=dream_id,
        user_id=current_user.id,
        file_url=file_url,
        attachment_type=attachment_type,
        file_size=file_size,
        mime_type=mime_type,
        duration=duration,
    )
    return {
        "id": str(att.id),
        "file_url": att.file_url,
        "attachment_type": att.attachment_type.value,
        "created_at": att.created_at.isoformat() if att.created_at else None,
    }


@router.delete("/{dream_id}/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
    dream_id: UUID,
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除附件"""
    service = DreamService(db)
    await service.delete_attachment(dream_id, attachment_id, current_user.id)


# 语音转文字已迁移到 WebSocket 实时流式转录
# 见 app/api/voice_ws.py -> /ws/voice/transcribe

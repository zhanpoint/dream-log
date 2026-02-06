"""
梦境 CRUD API 路由
"""

from datetime import date
from uuid import UUID

from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_arq_redis, get_current_user, get_db
from app.models.user import User
from app.schemas.dreams import (
    AnalysisStatusResponse,
    AnalysisTaskResponse,
    CreateDreamRequest,
    CreateTagRequest,
    DreamDetailResponse,
    DreamListItem,
    DreamListResponse,
    EmotionResponse,
    TagResponse,
    UpdateDreamRequest,
    UpdateTagRequest,
)
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
        created_at=dream.created_at,
        dream_types=[
            m.dream_type.type_name.value
            for m in dream.type_mappings
            if m.dream_type
        ],
        tags=[
            TagResponse(id=dt.tag.id, name=dt.tag.name, color=dt.tag.color)
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
        sleep_duration_minutes=dream.sleep_duration_minutes,
        awakening_state=dream.awakening_state.value if dream.awakening_state else None,
        sleep_quality=dream.sleep_quality,
        sleep_fragmented=dream.sleep_fragmented,
        sleep_depth=dream.sleep_depth,
        # 情绪
        primary_emotion=dream.primary_emotion,
        emotion_intensity=dream.emotion_intensity,
        emotion_residual=dream.emotion_residual,
        emotion_conflict_index=dream.emotion_conflict_index,
        emotions=[
            EmotionResponse(
                emotion_type=e.emotion_type.value,
                score=e.score,
                source=e.source.value,
            )
            for e in dream.emotions
        ],
        # 特征
        lucidity_level=dream.lucidity_level,
        vividness_level=dream.vividness_level,
        # 感官
        sensory_visual=dream.sensory_visual,
        sensory_auditory=dream.sensory_auditory,
        sensory_tactile=dream.sensory_tactile,
        sensory_olfactory=dream.sensory_olfactory,
        sensory_gustatory=dream.sensory_gustatory,
        sensory_spatial=dream.sensory_spatial,
        # 现实关联
        reality_correlation=dream.reality_correlation,
        # AI
        ai_processed=dream.ai_processed,
        ai_processing_status=dream.ai_processing_status.value if dream.ai_processing_status else "PENDING",
        ai_processed_at=dream.ai_processed_at,
        # 洞察
        life_context=insight.life_context if insight else None,
        user_interpretation=insight.user_interpretation if insight else None,
        content_structured=insight.content_structured if insight else None,
        ai_analysis=insight.ai_analysis if insight else None,
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
            TagResponse(id=dt.tag.id, name=dt.tag.name, color=dt.tag.color)
            for dt in dream.tags
            if dt.tag
        ],
        attachments_count=len(dream.attachments) if dream.attachments else 0,
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


@router.post("/{dream_id}/analyze")
async def trigger_analysis(
    dream_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq: ArqRedis = Depends(get_arq_redis),
) -> dict[str, str]:
    """手动触发 AI 分析"""
    service = DreamService(db)
    dream = await service.get_dream(dream_id, current_user.id)

    from app.models.enums import AIProcessingStatus

    dream.ai_processing_status = AIProcessingStatus.PENDING
    dream.ai_processed = False
    await db.commit()

    await arq.enqueue_job("analyze_dream", str(dream.id))
    return {"message": "AI 分析已加入队列", "status": "PENDING"}


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
        tasks=[
            AnalysisTaskResponse(
                id=t.id,
                task_type=t.task_type.value,
                status=t.status.value,
                model_name=t.model_name,
                error_message=t.error_message,
                started_at=t.started_at,
                completed_at=t.completed_at,
                processing_time_ms=t.processing_time_ms,
            )
            for t in data["tasks"]
        ],
    )


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
    return [TagResponse(id=t.id, name=t.name, color=t.color) for t in tags]


@tag_router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    request: CreateTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TagResponse:
    """创建标签"""
    service = DreamService(db)
    tag = await service.create_tag(current_user.id, request)
    return TagResponse(id=tag.id, name=tag.name, color=tag.color)


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
    return TagResponse(id=tag.id, name=tag.name, color=tag.color)


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

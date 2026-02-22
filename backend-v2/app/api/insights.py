"""
洞察报告 API 路由
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.enums import InsightType
from app.models.user import User
from app.schemas.insights import (
    GenerateAnnualReportRequest,
    GenerateMonthlyReportRequest,
    GenerateThemeReportRequest,
    GenerateWeeklyReportRequest,
    InsightListResponse,
    InsightResponse,
    InsightSettingsResponse,
    InsightUnreadSummaryResponse,
    UpdateInsightSettingsRequest,
)
from app.services.insight_service import InsightService

router = APIRouter(prefix="/insights", tags=["洞察报告"])


def _to_response(insight) -> InsightResponse:
    return InsightResponse(
        id=insight.id,
        insight_type=insight.insight_type.value,
        title=insight.title,
        time_period_start=insight.time_period_start,
        time_period_end=insight.time_period_end,
        data=insight.data,
        narrative=insight.narrative,
        is_read=insight.is_read,
        created_at=insight.created_at,
        expires_at=insight.expires_at,
    )


@router.get("", response_model=InsightListResponse)
async def list_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    insight_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> InsightListResponse:
    """获取洞察列表"""
    service = InsightService(db)
    items, total = await service.get_list(
        current_user.id, insight_type=insight_type, page=page, page_size=page_size
    )
    return InsightListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_to_response(i) for i in items],
    )


@router.get("/settings", response_model=InsightSettingsResponse)
async def get_insight_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightSettingsResponse:
    """获取洞察设置"""
    service = InsightService(db)
    settings = await service.get_settings(current_user.id)
    return InsightSettingsResponse.model_validate(settings)


@router.put("/settings", response_model=InsightSettingsResponse)
async def update_insight_settings(
    request: UpdateInsightSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightSettingsResponse:
    """更新洞察设置"""
    service = InsightService(db)
    settings = await service.update_settings(
        current_user.id, request.model_dump(exclude_unset=True)
    )
    return InsightSettingsResponse.model_validate(settings)


@router.get("/unread-summary", response_model=InsightUnreadSummaryResponse)
async def get_unread_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightUnreadSummaryResponse:
    """获取各报告类型是否存在未读记录"""
    service = InsightService(db)
    summary = await service.get_unread_summary(current_user.id)
    return InsightUnreadSummaryResponse(**summary)


@router.post("/cleanup")
async def cleanup_expired(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """清理过期报告"""
    service = InsightService(db)
    await service.cleanup_expired(current_user.id)
    return None


@router.post("/cleanup/all")
async def cleanup_all(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """清理所有洞察报告（仅当前用户）"""
    service = InsightService(db)
    await service.cleanup_all(current_user.id)
    return None


@router.get("/{insight_id}", response_model=InsightResponse)
async def get_insight(
    insight_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    """获取报告详情"""
    service = InsightService(db)
    insight = await service.get_by_id(insight_id, current_user.id)
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")
    return _to_response(insight)


@router.post("/{insight_id}/read")
async def mark_insight_read(
    insight_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """标记报告已读"""
    service = InsightService(db)
    ok = await service.mark_as_read(insight_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")
    return {"message": "已标记为已读"}


@router.delete("/{insight_id}", status_code=204)
async def delete_insight(
    insight_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除报告"""
    service = InsightService(db)
    ok = await service.delete_insight(insight_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")


# ========== 生成端点 ==========

@router.post("/monthly/generate", response_model=InsightResponse)
async def generate_monthly_report(
    request: GenerateMonthlyReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    """手动生成月报"""
    service = InsightService(db)
    insight = await service.generate_monthly_report(
        current_user.id, request.year, request.month
    )
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="梦境数据不足，无法生成报告（至少需要5条）",
        )
    return _to_response(insight)


@router.post("/weekly/generate", response_model=InsightResponse)
async def generate_weekly_report(
    request: GenerateWeeklyReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    """手动生成周报（week_start 为周一日期）"""
    service = InsightService(db)
    insight = await service.generate_weekly_report(current_user.id, request.week_start)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="本周梦境数据不足，无法生成周报（至少需要3条）",
        )
    return _to_response(insight)


@router.post("/annual/generate", response_model=InsightResponse)
async def generate_annual_report(
    request: GenerateAnnualReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    """手动生成年度回顾"""
    service = InsightService(db)
    insight = await service.generate_annual_report(current_user.id, request.year)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="年度梦境数据不足，无法生成年度回顾",
        )
    return _to_response(insight)


@router.post("/theme/generate", response_model=InsightResponse)
async def generate_theme_report(
    request: GenerateThemeReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    """手动生成专题分析（情绪健康 / 睡眠质量 / 梦境主题）"""
    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="结束日期不能早于开始日期",
        )
    if request.days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="时间范围不能超过365天",
        )

    service = InsightService(db)

    if request.report_type == InsightType.EMOTION_HEALTH.value:
        insight = await service.generate_emotion_health_report(
            current_user.id, request.start_date, request.end_date, request.with_comparison
        )
    elif request.report_type == InsightType.SLEEP_QUALITY.value:
        insight = await service.generate_sleep_quality_report(
            current_user.id, request.start_date, request.end_date, request.with_comparison
        )
    elif request.report_type == InsightType.THEME_PATTERN.value:
        insight = await service.generate_theme_pattern_report(
            current_user.id, request.start_date, request.end_date
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的报告类型: {request.report_type}",
        )

    if not insight:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="生成失败，请稍后重试",
        )
    return _to_response(insight)

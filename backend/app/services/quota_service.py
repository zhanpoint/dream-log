"""额度服务（按月周期）。

说明：
- 暂不使用 Redis；直接落 DB。
- 高成本操作的冷却时间可以在调用方控制（例如在具体 API 中记录 last_action_at）。
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.subscription import PlanQuota, get_plan_limits
from app.models.quota_usage_log import QuotaUsageLog
from app.models.subscription import UserSubscription
from app.models.usage_quota import UserQuotaUsage, month_start


def _today_utc() -> datetime:
    return datetime.now(timezone.utc)


async def get_current_plan_type(user_id: str, db: AsyncSession) -> str:
    result = await db.execute(
        select(UserSubscription.plan_type, UserSubscription.status).where(
            UserSubscription.user_id == user_id
        )
    )
    row = result.one_or_none()
    if not row:
        return "free"
    plan_type, status = row
    plan_type = plan_type or "free"
    status = status or "incomplete"
    # 权益判定：active/past_due 保持当前 plan，其它状态按 free
    if plan_type != "free" and status in {"active", "past_due"}:
        return plan_type
    return "free"


async def get_or_create_usage_row(user_id: str, db: AsyncSession) -> UserQuotaUsage:
    period = month_start(_today_utc())
    result = await db.execute(
        select(UserQuotaUsage).where(
            UserQuotaUsage.user_id == user_id,
            UserQuotaUsage.period_start == period,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        return row

    row = UserQuotaUsage(user_id=user_id, period_start=period)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


def _get_field_name(action: str) -> str:
    mapping = {
        "dream_analysis": "dream_analysis_used",
        "title_analysis": "title_analysis_used",
        "image_generation": "image_generation_used",
        "weekly_reports": "weekly_reports_used",
        "monthly_reports": "monthly_reports_used",
        "yearly_reports": "yearly_reports_used",
        "topic_reports": "topic_reports_used",
    }
    if action not in mapping:
        raise ValueError(f"Unknown quota action: {action}")
    return mapping[action]


def _get_limit_value(limits: PlanQuota, action: str) -> int:
    data = asdict(limits)
    if action not in data:
        raise ValueError(f"Unknown quota action: {action}")
    return int(data[action])


async def check_and_consume(
    user_id: str,
    action: str,
    amount: int,
    db: AsyncSession,
    meta: str | None = None,
) -> UserQuotaUsage:
    """检查额度并扣减。

    action: dream_analysis/title_analysis/image_generation/weekly_reports/...
    """

    if amount <= 0:
        raise ValueError("amount must be positive")

    plan_type = await get_current_plan_type(user_id, db)
    limits = get_plan_limits(plan_type)
    usage = await get_or_create_usage_row(user_id, db)

    used_field = _get_field_name(action)
    used = getattr(usage, used_field)
    limit_value = _get_limit_value(limits, action)

    if used + amount > limit_value:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "quota_exceeded",
                "action": action,
                "plan": plan_type,
                "used": used,
                "limit": limit_value,
            },
        )

    setattr(usage, used_field, used + amount)
    db.add(
        QuotaUsageLog(
            user_id=user_id,
            action=action,
            amount=amount,
            plan_type=plan_type,
            period_start=datetime.combine(usage.period_start, datetime.min.time(), tzinfo=timezone.utc),
            meta=meta,
        )
    )
    await db.commit()
    await db.refresh(usage)
    return usage


async def get_quota_snapshot(user_id: str, db: AsyncSession) -> dict:
    plan_type = await get_current_plan_type(user_id, db)
    limits = get_plan_limits(plan_type)
    usage = await get_or_create_usage_row(user_id, db)

    return {
        "plan_type": plan_type,
        "period_start": usage.period_start,
        "limits": asdict(limits),
        "used": {
            "dream_analysis": usage.dream_analysis_used,
            "title_analysis": usage.title_analysis_used,
            "image_generation": usage.image_generation_used,
            "weekly_reports": usage.weekly_reports_used,
            "monthly_reports": usage.monthly_reports_used,
            "yearly_reports": usage.yearly_reports_used,
            "topic_reports": usage.topic_reports_used,
        },
    }

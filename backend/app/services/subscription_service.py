"""
订阅状态服务
"""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.subscription import PLAN_PRICING
from app.core.config import settings
from app.models.subscription import UserSubscription
from app.models.user import User


async def get_or_create_subscription(
    user_id: str,
    db: AsyncSession,
) -> UserSubscription:
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()
    if subscription:
        return subscription

    subscription = UserSubscription(user_id=user_id)
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


async def update_subscription_from_stripe(
    user_id: str,
    stripe_customer_id: str | None,
    stripe_subscription_id: str | None,
    stripe_price_id: str | None,
    plan_type: str,
    status: str,
    current_period_end: datetime | None,
    cancel_at_period_end: bool,
    status_reason: str | None = None,
    pending_stripe_price_id: str | None = None,
    pending_plan_type: str | None = None,
    pending_effective_at: datetime | None = None,
    db: AsyncSession | None = None,
) -> UserSubscription:
    if db is None:
        raise ValueError("db is required")
    subscription = await get_or_create_subscription(user_id, db)
    subscription.stripe_customer_id = stripe_customer_id
    subscription.stripe_subscription_id = stripe_subscription_id
    subscription.stripe_price_id = stripe_price_id
    subscription.plan_type = plan_type
    subscription.status = status
    subscription.status_reason = status_reason
    subscription.current_period_end = current_period_end
    subscription.cancel_at_period_end = cancel_at_period_end
    subscription.pending_stripe_price_id = pending_stripe_price_id
    subscription.pending_plan_type = pending_plan_type
    subscription.pending_effective_at = pending_effective_at
    await db.commit()
    await db.refresh(subscription)
    return subscription


def derive_plan_type(price_id: str | None) -> str:
    if not price_id:
        return "free"
    if settings.stripe_price_ultra_monthly and price_id == settings.stripe_price_ultra_monthly:
        return "ultra"
    if settings.stripe_price_pro_monthly and price_id == settings.stripe_price_pro_monthly:
        return "pro"
    return "free"


def get_plan_pricing_map() -> dict[str, float]:
    return {key: float(value.monthly_price) for key, value in PLAN_PRICING.items()}


async def attach_customer_to_user(
    user: User,
    stripe_customer_id: str,
    db: AsyncSession,
) -> UserSubscription:
    subscription = await get_or_create_subscription(str(user.id), db)
    subscription.stripe_customer_id = stripe_customer_id
    await db.commit()
    await db.refresh(subscription)
    return subscription

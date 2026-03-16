"""订阅与额度配置（软配置）。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanQuota:
    dream_analysis: int
    title_analysis: int
    image_generation: int
    weekly_reports: int
    monthly_reports: int
    yearly_reports: int
    topic_reports: int


@dataclass(frozen=True)
class PlanPricing:
    monthly_price: float
    yearly_price: float | None = None


PLAN_LIMITS: dict[str, PlanQuota] = {
    "free": PlanQuota(
        dream_analysis=30,
        title_analysis=100,
        image_generation=3,
        weekly_reports=1,
        monthly_reports=1,
        yearly_reports=1,
        topic_reports=3,
    ),
    "pro": PlanQuota(
        dream_analysis=150,
        title_analysis=300,
        image_generation=60,
        weekly_reports=7,
        monthly_reports=3,
        yearly_reports=3,
        topic_reports=30,
    ),
    "ultra": PlanQuota(
        dream_analysis=600,
        title_analysis=1500,
        image_generation=200,
        weekly_reports=30,
        monthly_reports=12,
        yearly_reports=12,
        topic_reports=200,
    ),
}

PLAN_PRICING: dict[str, PlanPricing] = {
    "free": PlanPricing(monthly_price=0),
    "pro": PlanPricing(monthly_price=9.9, yearly_price=89),
    "ultra": PlanPricing(monthly_price=29.9, yearly_price=279),
}


def get_plan_limits(plan_type: str) -> PlanQuota:
    return PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])


def get_plan_pricing(plan_type: str) -> PlanPricing:
    return PLAN_PRICING.get(plan_type, PLAN_PRICING["free"])

"""
订阅相关 Schemas
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PendingUpdateInfo(BaseModel):
    price_id: str | None = None
    plan_type: str | None = None
    effective_at: datetime | None = None


class SubscriptionStatusResponse(BaseModel):
    """订阅状态响应"""

    model_config = ConfigDict(from_attributes=True)

    plan_type: str
    status: str
    status_reason: str | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    pending_update: PendingUpdateInfo | None = None


class CreateCheckoutSessionRequest(BaseModel):
    """创建 Stripe Checkout Session 请求"""

    price_id: str | None = None
    plan_type: str | None = None
    upgrade: bool = False


class CreateCheckoutSessionResponse(BaseModel):
    """创建 Stripe Checkout Session 响应"""

    checkout_url: str | None = None
    portal_url: str | None = None


class CreatePortalSessionResponse(BaseModel):
    """创建 Stripe Customer Portal Session 响应"""

    portal_url: str


class PlanPricingResponse(BaseModel):
    """计划价格响应"""

    pricing: dict[str, float]


class BillingClientConfigResponse(BaseModel):
    """提供给前端的 billing 开关配置（由后端 .env 决定）"""

    billing_disabled: bool

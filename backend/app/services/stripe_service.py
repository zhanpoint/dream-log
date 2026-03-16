"""
Stripe 支付服务
"""

from __future__ import annotations

from datetime import datetime, timezone

import stripe
from fastapi import HTTPException, status
import anyio
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

from app.models.user import User
from app.services.subscription_service import get_or_create_subscription


class StripeService:
    """Stripe 订阅服务"""

    def __init__(self) -> None:
        if not settings.stripe_secret_key:
            raise RuntimeError("Stripe secret key 未配置")
        stripe.api_key = settings.stripe_secret_key

    def _get_success_url(self) -> str:
        if not settings.stripe_success_url:
            raise RuntimeError("Stripe success URL 未配置")
        return settings.stripe_success_url

    def _get_cancel_url(self) -> str:
        if not settings.stripe_cancel_url:
            raise RuntimeError("Stripe cancel URL 未配置")
        return settings.stripe_cancel_url

    def _get_portal_return_url(self) -> str:
        if not settings.stripe_portal_return_url:
            raise RuntimeError("Stripe portal return URL 未配置")
        return settings.stripe_portal_return_url

    @staticmethod
    def get_price_id_for_plan(plan_type: str | None) -> str:
        plan = (plan_type or "pro").lower()
        if plan == "ultra":
            if not settings.stripe_price_ultra_monthly:
                raise RuntimeError("Stripe Ultra 月度 price_id 未配置")
            return settings.stripe_price_ultra_monthly
        if not settings.stripe_price_pro_monthly:
            raise RuntimeError("Stripe Pro 月度 price_id 未配置")
        return settings.stripe_price_pro_monthly

    @staticmethod
    def unix_to_datetime(timestamp: int | None) -> datetime | None:
        if not timestamp:
            return None
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)

    async def create_checkout_session(
        self, user: User, db: AsyncSession, price_id: str
    ) -> str:
        customer_id = await self._ensure_customer(user, db)
        session = await anyio.to_thread.run_sync(
            lambda: stripe.checkout.Session.create(
                customer=customer_id,
                client_reference_id=str(user.id),
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=self._get_success_url(),
                cancel_url=self._get_cancel_url(),
                allow_promotion_codes=True,
                customer_update={"address": "auto"},
                automatic_tax={"enabled": True},
                subscription_data={"metadata": {"user_id": str(user.id)}},
            )
        )
        return session.url

    async def create_portal_session(
        self,
        user: User,
        db: AsyncSession,
        *,
        flow_type: str | None = None,
        stripe_subscription_id: str | None = None,
        target_price_id: str | None = None,
    ) -> str:
        customer_id = await self._ensure_customer(user, db)
        params: dict = {
            "customer": customer_id,
            "return_url": self._get_portal_return_url(),
        }
        if settings.stripe_portal_configuration_id:
            params["configuration"] = settings.stripe_portal_configuration_id
        if flow_type == "subscription_update" and stripe_subscription_id:
            # 使用 subscription_update_confirm + after_completion redirect
            # 这样用户完成更新后会自动跳回我们站点，而不是停留在 Stripe 托管成功页。
            if not target_price_id:
                raise RuntimeError("订阅更新 flow 缺少 target_price_id")

            subscription = await anyio.to_thread.run_sync(
                lambda: stripe.Subscription.retrieve(
                    stripe_subscription_id, expand=["items.data"]
                )
            )
            items = subscription.get("items", {}).get("data", [])
            if not items:
                raise RuntimeError("Stripe subscription items 为空，无法更新订阅")
            subscription_item_id = items[0].get("id")
            if not subscription_item_id:
                raise RuntimeError("无法获取 subscription_item_id")

            params["flow_data"] = {
                "type": "subscription_update_confirm",
                "after_completion": {
                    "type": "redirect",
                    "redirect": {"return_url": self._get_portal_return_url()},
                },
                "subscription_update_confirm": {
                    "subscription": stripe_subscription_id,
                    "items": [
                        {
                            "id": subscription_item_id,
                            "price": target_price_id,
                            "quantity": 1,
                        }
                    ],
                },
            }

        session = await anyio.to_thread.run_sync(
            lambda: stripe.billing_portal.Session.create(**params)
        )
        return session.url

    async def _ensure_customer(self, user: User, db: AsyncSession) -> str:
        subscription = await get_or_create_subscription(str(user.id), db)
        if subscription.stripe_customer_id:
            return subscription.stripe_customer_id

        customer = await anyio.to_thread.run_sync(
            lambda: stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)},
            )
        )
        subscription.stripe_customer_id = customer.id
        await db.commit()
        await db.refresh(subscription)
        return customer.id


def normalize_subscription_status(status: str | None) -> str:
    """统一订阅状态机（仅返回有限集合），避免下游判定分裂。"""
    if not status:
        return "incomplete"
    if status in {"trialing", "active"}:
        return "active"
    if status in {"past_due", "unpaid"}:
        return "past_due"
    if status in {"incomplete", "incomplete_expired"}:
        return "incomplete"
    if status in {"canceled"}:
        return "canceled"
    # 兜底：未知状态按 incomplete 处理，避免误发放权益
    return "incomplete"


def ensure_stripe_signature(payload: bytes, signature: str | None) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise RuntimeError("Stripe webhook secret 未配置")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe signature 缺失",
        )
    try:
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=settings.stripe_webhook_secret,
        )
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe signature 校验失败: {exc}",
        )

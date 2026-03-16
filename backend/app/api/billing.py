"""
订阅支付 API
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import logging
import json
from datetime import datetime, timezone

from app.core.deps import get_current_user, get_db
from app.models.stripe_webhook_event import StripeWebhookEvent
from app.models.subscription import UserSubscription
from app.models.user import User
from app.schemas.subscription import (
    BillingClientConfigResponse,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionResponse,
    PlanPricingResponse,
    SubscriptionStatusResponse,
)
from app.core.config import settings
from app.services.stripe_service import StripeService, ensure_stripe_signature, normalize_subscription_status
from app.services.subscription_service import (
    attach_customer_to_user,
    derive_plan_type,
    get_or_create_subscription,
    get_plan_pricing_map,
    update_subscription_from_stripe,
)
from app.core.sse_manager import sse_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["订阅"])


@router.get("/client-config", response_model=BillingClientConfigResponse)
async def get_billing_client_config() -> BillingClientConfigResponse:
    return BillingClientConfigResponse(billing_disabled=bool(settings.billing_disabled))


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionStatusResponse:
    subscription = await get_or_create_subscription(str(current_user.id), db)
    return SubscriptionStatusResponse(
        plan_type=subscription.plan_type,
        status=subscription.status,
        status_reason=subscription.status_reason,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        pending_update={
            "price_id": subscription.pending_stripe_price_id,
            "plan_type": subscription.pending_plan_type,
            "effective_at": subscription.pending_effective_at,
        }
        if (
            subscription.pending_stripe_price_id
            or subscription.pending_plan_type
            or subscription.pending_effective_at
        )
        else None,
    )


@router.post("/checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    payload: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateCheckoutSessionResponse:
    if settings.billing_disabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BILLING_DISABLED",
        )
    stripe_service = StripeService()
    price_id = payload.price_id or stripe_service.get_price_id_for_plan(payload.plan_type)

    subscription = await get_or_create_subscription(str(current_user.id), db)
    if (
        payload.upgrade
        and subscription.plan_type != "free"
        and subscription.status in {"active", "trialing", "past_due"}
        and subscription.stripe_subscription_id
    ):
        portal_url = await stripe_service.create_portal_session(
            current_user,
            db,
            flow_type="subscription_update",
            stripe_subscription_id=subscription.stripe_subscription_id,
            target_price_id=price_id,
        )
        return CreateCheckoutSessionResponse(portal_url=portal_url)

    checkout_url = await stripe_service.create_checkout_session(
        current_user, db, price_id
    )
    return CreateCheckoutSessionResponse(checkout_url=checkout_url)


@router.post("/portal", response_model=CreatePortalSessionResponse)
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreatePortalSessionResponse:
    if settings.billing_disabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BILLING_DISABLED",
        )
    stripe_service = StripeService()
    portal_url = await stripe_service.create_portal_session(current_user, db)
    return CreatePortalSessionResponse(portal_url=portal_url)


@router.get("/plans", response_model=PlanPricingResponse)
async def get_plan_pricing() -> PlanPricingResponse:
    pricing = get_plan_pricing_map()
    return PlanPricingResponse(pricing=pricing)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    event = ensure_stripe_signature(payload, signature)

    # 幂等 + 可重试：Stripe 可能重放同一个 event.id
    event_id = event.get("id")
    event_type = event.get("type")
    event_row: StripeWebhookEvent | None = None
    if event_id and event_type:
        event_id = str(event_id)
        event_type = str(event_type)
        existing = await db.execute(
            select(StripeWebhookEvent).where(StripeWebhookEvent.event_id == event_id)
        )
        event_row = existing.scalar_one_or_none()
        if event_row and event_row.processing_status == "processed":
            return JSONResponse(status_code=status.HTTP_200_OK, content={"received": True})
        if not event_row:
            event_row = StripeWebhookEvent(
                event_id=event_id,
                event_type=event_type,
                livemode=bool(event.get("livemode", False)),
                created=event.get("created"),
                payload=json.dumps(event, ensure_ascii=False),
            )
            db.add(event_row)
        event_row.processing_status = "processing"
        event_row.attempts = int(event_row.attempts or 0) + 1
        event_row.last_attempt_at = datetime.now(timezone.utc)
        event_row.last_error = None
        await db.commit()

    data_object = event.get("data", {}).get("object", {})

    try:
        if event_type in {
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        }:
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("id")
            items = data_object.get("items", {}).get("data", [])
            price_id = items[0].get("price", {}).get("id") if items else None

            plan_type = derive_plan_type(price_id)
            status_value = normalize_subscription_status(data_object.get("status"))

            pending_update = data_object.get("pending_update") or {}
            pending_items = pending_update.get("subscription_items") or []
            pending_price_id = None
            if pending_items:
                pending_price = pending_items[0].get("price")
                pending_price_id = pending_price.get("id") if isinstance(pending_price, dict) else pending_price
            pending_plan_type = derive_plan_type(pending_price_id) if pending_price_id else None
            pending_effective_at = StripeService.unix_to_datetime(pending_update.get("effective_at"))

            logger.info(
                "Stripe subscription event received: type=%s customer=%s subscription=%s price_id=%s plan_type=%s",
                event_type,
                customer_id,
                subscription_id,
                price_id,
                plan_type,
            )

            if customer_id:
                user = await _get_user_by_customer_id(customer_id, db)
                if user:
                    if event_type == "customer.subscription.deleted":
                        await update_subscription_from_stripe(
                            user_id=str(user.id),
                            stripe_customer_id=customer_id,
                            stripe_subscription_id=None,
                            stripe_price_id=None,
                            plan_type="free",
                            status="canceled",
                            status_reason=None,
                            current_period_end=None,
                            cancel_at_period_end=False,
                            db=db,
                        )
                    else:
                        await update_subscription_from_stripe(
                            user_id=str(user.id),
                            stripe_customer_id=customer_id,
                            stripe_subscription_id=subscription_id,
                            stripe_price_id=price_id,
                            plan_type=plan_type,
                            status=status_value,
                            status_reason=None,
                            current_period_end=StripeService.unix_to_datetime(
                                data_object.get("current_period_end")
                            ),
                            cancel_at_period_end=bool(data_object.get("cancel_at_period_end")),
                            pending_stripe_price_id=pending_price_id,
                            pending_plan_type=pending_plan_type,
                            pending_effective_at=pending_effective_at,
                            db=db,
                        )
                        await sse_manager.send_to_user(
                            user.id,
                            "subscription_updated",
                            {
                                "stripe_subscription_id": subscription_id,
                                "price_id": price_id,
                                "plan_type": plan_type,
                                "status": status_value,
                                "pending_update": {
                                    "price_id": pending_price_id,
                                    "plan_type": pending_plan_type,
                                    "effective_at": pending_effective_at.isoformat()
                                    if pending_effective_at
                                    else None,
                                },
                            },
                        )

        elif event_type == "checkout.session.completed":
            customer_id = data_object.get("customer")
            user_id = data_object.get("client_reference_id")
            subscription_id = data_object.get("subscription")

            user = None
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
            if not user and customer_id:
                user = await _get_user_by_customer_id(customer_id, db)

            if user and customer_id:
                await attach_customer_to_user(user, customer_id, db)
                # 收敛事件来源：订阅权益以 customer.subscription.* 为准。
                # checkout.session.completed 仅用于尽早记录 subscription_id（便于追踪/Portal 操作）。
                if subscription_id:
                    current = await get_or_create_subscription(str(user.id), db)
                    if not current.stripe_subscription_id:
                        await update_subscription_from_stripe(
                            user_id=str(user.id),
                            stripe_customer_id=customer_id,
                            stripe_subscription_id=subscription_id,
                            stripe_price_id=current.stripe_price_id,
                            plan_type=current.plan_type or "free",
                            status=current.status or "incomplete",
                            current_period_end=current.current_period_end,
                            cancel_at_period_end=bool(current.cancel_at_period_end),
                            status_reason=None,
                            pending_stripe_price_id=current.pending_stripe_price_id,
                            pending_plan_type=current.pending_plan_type,
                            pending_effective_at=current.pending_effective_at,
                            db=db,
                        )

        elif event_type in {
            "invoice.payment_failed",
            "invoice.payment_action_required",
            "invoice.finalization_failed",
            "invoice.marked_uncollectible",
            "payment_intent.payment_failed",
            "checkout.session.async_payment_failed",
        }:
            customer_id = data_object.get("customer") or data_object.get("customer_id")
            if customer_id:
                user = await _get_user_by_customer_id(customer_id, db)
                if user:
                    subscription_row = await get_or_create_subscription(str(user.id), db)
                    await update_subscription_from_stripe(
                        user_id=str(user.id),
                        stripe_customer_id=customer_id,
                        stripe_subscription_id=subscription_row.stripe_subscription_id
                        or data_object.get("subscription"),
                        stripe_price_id=subscription_row.stripe_price_id,
                        plan_type=subscription_row.plan_type or "free",
                        status="past_due",
                        status_reason=event_type,
                        current_period_end=subscription_row.current_period_end,
                        cancel_at_period_end=bool(subscription_row.cancel_at_period_end),
                        db=db,
                    )

        elif event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
            customer_id = data_object.get("customer")
            if customer_id:
                user = await _get_user_by_customer_id(customer_id, db)
                if user:
                    subscription_row = await get_or_create_subscription(str(user.id), db)
                    await update_subscription_from_stripe(
                        user_id=str(user.id),
                        stripe_customer_id=customer_id,
                        stripe_subscription_id=subscription_row.stripe_subscription_id,
                        stripe_price_id=subscription_row.stripe_price_id,
                        plan_type=subscription_row.plan_type or "free",
                        status="incomplete",
                        status_reason=event_type,
                        current_period_end=subscription_row.current_period_end,
                        cancel_at_period_end=bool(subscription_row.cancel_at_period_end),
                        db=db,
                    )

        elif event_type == "invoice.payment_succeeded":
            customer_id = data_object.get("customer")
            if customer_id:
                user = await _get_user_by_customer_id(customer_id, db)
                if user:
                    current = await get_or_create_subscription(str(user.id), db)
                    # 不在这里调用 Stripe 取 subscription（避免重复与阻塞）；等待 customer.subscription.updated 同步权益。
                    await update_subscription_from_stripe(
                        user_id=str(user.id),
                        stripe_customer_id=customer_id,
                        stripe_subscription_id=current.stripe_subscription_id,
                        stripe_price_id=current.stripe_price_id,
                        plan_type=current.plan_type or "free",
                        status="active",
                        status_reason=None,
                        current_period_end=current.current_period_end,
                        cancel_at_period_end=bool(current.cancel_at_period_end),
                        pending_stripe_price_id=current.pending_stripe_price_id,
                        pending_plan_type=current.pending_plan_type,
                        pending_effective_at=current.pending_effective_at,
                        db=db,
                    )

        if event_row:
            event_row.processing_status = "processed"
            event_row.processed_at = datetime.now(timezone.utc)
            await db.commit()
        return JSONResponse(status_code=status.HTTP_200_OK, content={"received": True})
    except Exception as exc:
        if event_row:
            event_row.processing_status = "failed"
            event_row.last_error = str(exc)[:8000]
            await db.commit()
        raise


async def _get_user_by_customer_id(
    stripe_customer_id: str,
    db: AsyncSession,
) -> User | None:
    result = await db.execute(
        select(User)
        .join(UserSubscription)
        .where(UserSubscription.stripe_customer_id == stripe_customer_id)
    )
    return result.scalar_one_or_none()

"""
Pydantic Schemas 模块
"""

from app.schemas.auth import (
    AuthResponse,
    EmailCheckRequest,
    EmailCheckResponse,
    GoogleCallbackRequest,
    LoginWithCodeRequest,
    LoginWithPasswordRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SendCodeRequest,
    SignupWithCodeRequest,
    SignupWithPasswordRequest,
    UserResponse,
    ValidatePasswordRequest,
    ValidatePasswordResponse,
    VerifyCodeRequest,
)
from app.schemas.subscription import (
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionResponse,
    PlanPricingResponse,
    SubscriptionStatusResponse,
)
from app.schemas.quota import QuotaSnapshotResponse

__all__ = [
    # 请求 Schemas
    "EmailCheckRequest",
    "SendCodeRequest",
    "VerifyCodeRequest",
    "SignupWithCodeRequest",
    "SignupWithPasswordRequest",
    "LoginWithPasswordRequest",
    "LoginWithCodeRequest",
    "ValidatePasswordRequest",
    "ResetPasswordRequest",
    "GoogleCallbackRequest",
    "RefreshTokenRequest",
    # 响应 Schemas
    "UserResponse",
    "AuthResponse",
    "EmailCheckResponse",
    "ValidatePasswordResponse",
    "MessageResponse",
    # 订阅 Schemas
    "SubscriptionStatusResponse",
    "CreateCheckoutSessionRequest",
    "CreateCheckoutSessionResponse",
    "CreatePortalSessionResponse",
    "PlanPricingResponse",
    "QuotaSnapshotResponse",
]

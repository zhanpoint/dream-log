"""
认证相关的 Pydantic Schemas
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============= 请求 Schemas =============


class EmailCheckRequest(BaseModel):
    """邮箱检查请求"""

    email: EmailStr


class SendCodeRequest(BaseModel):
    """发送验证码请求"""

    email: EmailStr
    purpose: Literal["signup", "login", "reset", "change_email"]


class VerifyCodeRequest(BaseModel):
    """验证验证码请求"""

    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")


class SignupWithCodeRequest(BaseModel):
    """验证码注册请求"""

    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")
    name: str | None = Field(None, max_length=150, description="用户名")


class SignupWithPasswordRequest(BaseModel):
    """密码注册请求"""

    email: EmailStr
    password: str = Field(..., min_length=8, description="密码至少8位")
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")
    name: str | None = Field(None, max_length=150, description="用户名")


class LoginWithPasswordRequest(BaseModel):
    """密码登录请求"""

    email: EmailStr
    password: str


class LoginWithCodeRequest(BaseModel):
    """验证码登录请求"""

    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")


class ValidatePasswordRequest(BaseModel):
    """密码验证请求"""

    password: str


class ResetPasswordRequest(BaseModel):
    """重置密码请求"""

    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")
    new_password: str = Field(..., min_length=8, description="新密码至少8位")


class GoogleCallbackRequest(BaseModel):
    """Google OAuth 回调请求"""

    code: str


class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""

    refreshToken: str


# ============= 响应 Schemas =============


class UserResponse(BaseModel):
    """用户响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str | None = None
    avatar: str | None = None
    registration_method: str
    created_at: datetime


class AuthResponse(BaseModel):
    """认证响应"""

    token: str
    refresh_token: str | None = None
    user: UserResponse


class EmailCheckResponse(BaseModel):
    """邮箱检查响应"""

    exists: bool
    registered: bool
    has_password: bool | None = None  # 是否设置过密码(仅当exists=True时有值)


class ValidatePasswordResponse(BaseModel):
    """密码验证响应"""

    valid: bool
    errors: list[str] = Field(default_factory=list)


class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    expires_in: int | None = None

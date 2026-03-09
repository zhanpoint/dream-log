"""
用户相关的 Pydantic Schemas
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============= 请求 Schemas =============


class UpdateProfileRequest(BaseModel):
    """更新个人资料请求"""

    username: str | None = Field(
        None,
        min_length=3,
        max_length=20,
        # 只做长度限制，内容不做字符种类限制
    )
    bio: str | None = Field(None, max_length=200)
    birthday: date | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v is not None:
            # 去除前后空格
            v = v.strip()
            if not v:
                return None
        return v


class UpdateAvatarRequest(BaseModel):
    """更新头像请求"""

    avatar_url: str = Field(..., max_length=500)


class AvatarUploadSignatureRequest(BaseModel):
    """获取头像上传签名请求"""

    file_name: str = Field(..., max_length=255)
    content_type: str = Field(default="image/jpeg", max_length=100)


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""

    old_password: str | None = Field(None, description="旧密码（验证码登录的用户可以不提供）")
    new_password: str = Field(..., min_length=8, description="新密码至少8位")
    verification_code: str | None = Field(None, pattern=r"^\d{6}$", description="邮箱验证码（可选）")

    @field_validator("old_password", "new_password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is not None and v.strip():
            return v.strip()
        return v if v is None else None


class ChangeEmailRequest(BaseModel):
    """修改邮箱请求"""

    new_email: str = Field(..., max_length=255)
    verification_code: str = Field(..., pattern=r"^\d{6}$", description="新邮箱的验证码")


class CheckUsernameRequest(BaseModel):
    """检查用户名可用性请求"""

    username: str = Field(
        ...,
        min_length=3,
        max_length=20,
        # 与 UpdateProfileRequest 保持一致：只做长度限制
    )


# ============= 响应 Schemas =============


class UserProfileResponse(BaseModel):
    """用户资料响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str | None = None
    avatar: str | None = None
    bio: str | None = None
    birthday: date | None = None
    registration_method: str
    created_at: datetime


class AvatarUploadSignatureResponse(BaseModel):
    """头像上传签名响应"""

    upload_url: str
    access_url: str
    file_key: str
    expires_in: int


class CheckUsernameResponse(BaseModel):
    """检查用户名可用性响应"""

    available: bool
    message: str | None = None


class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str

"""
认证 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    EmailCheckRequest,
    EmailCheckResponse,
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
from app.services.auth_service import AuthService
from app.services.password_service import PasswordService
from app.services.token_service import TokenService

# 依赖注入将在后面实现
from app.core.deps import get_auth_service, get_current_user

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/check-email", response_model=EmailCheckResponse)
async def check_email(
    request: EmailCheckRequest, auth_service: AuthService = Depends(get_auth_service)
) -> EmailCheckResponse:
    """检查邮箱是否已注册"""
    auth_info = await auth_service.get_user_auth_info(request.email)
    return EmailCheckResponse(
        exists=auth_info["exists"],
        registered=auth_info["exists"],
        has_password=auth_info["has_password"] if auth_info["exists"] else None
    )


@router.post("/send-code", response_model=MessageResponse)
async def send_code(
    request: SendCodeRequest, auth_service: AuthService = Depends(get_auth_service)
) -> MessageResponse:
    """发送验证码"""
    if request.purpose == "change_email":
        if await auth_service.check_email_exists(request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已被使用",
            )

    # 检查频率限制
    allowed, wait_time = await auth_service.email_service.check_rate_limit(request.email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"发送过于频繁,请 {wait_time} 秒后再试",
        )

    # 发送验证码
    await auth_service.email_service.send_code(request.email, request.purpose)
    return MessageResponse(message="验证码发送成功", expires_in=300)


@router.post("/verify-code")
async def verify_code(
    request: VerifyCodeRequest, auth_service: AuthService = Depends(get_auth_service)
) -> dict[str, bool]:
    """验证验证码(不登录)"""
    valid = await auth_service.email_service.verify_code(request.email, request.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期"
        )
    return {"valid": True}


@router.post("/signup/code", response_model=AuthResponse)
async def signup_with_code(
    request: SignupWithCodeRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """使用验证码注册"""
    return await auth_service.signup_with_code(request.email, request.code, request.name)


@router.post("/signup/password", response_model=AuthResponse)
async def signup_with_password(
    request: SignupWithPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    """使用密码注册"""
    return await auth_service.signup_with_password(
        request.email, request.password, request.code, request.name
    )


@router.post("/login/password", response_model=AuthResponse)
async def login_with_password(
    request: LoginWithPasswordRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """使用密码登录"""
    return await auth_service.login_with_password(request.email, request.password)


@router.post("/login/code", response_model=AuthResponse)
async def login_with_code(
    request: LoginWithCodeRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """使用验证码登录"""
    return await auth_service.login_with_code(request.email, request.code)


@router.post("/validate-password", response_model=ValidatePasswordResponse)
async def validate_password(request: ValidatePasswordRequest) -> ValidatePasswordResponse:
    """验证密码强度"""
    result = PasswordService.validate_password_strength(request.password)
    return ValidatePasswordResponse(valid=result["valid"], errors=result["errors"])


@router.post("/reset-password/send-code", response_model=MessageResponse)
async def send_reset_password_code(
    request: EmailCheckRequest, auth_service: AuthService = Depends(get_auth_service)
) -> MessageResponse:
    """发送重置密码验证码"""
    # 检查用户是否存在
    if not await auth_service.check_email_exists(request.email):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 检查频率限制
    allowed, wait_time = await auth_service.email_service.check_rate_limit(request.email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"发送过于频繁,请 {wait_time} 秒后再试",
        )

    # 发送验证码
    await auth_service.email_service.send_code(request.email, "reset")
    return MessageResponse(message="验证码发送成功", expires_in=300)


@router.post("/reset-password/verify", response_model=AuthResponse)
async def reset_password(
    request: ResetPasswordRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """重置密码"""
    return await auth_service.reset_password(
        request.email, request.code, request.new_password
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """登出"""
    # TODO: 将 token 加入黑名单
    return {"message": "登出成功"}


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    request: RefreshTokenRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """刷新访问令牌"""
    try:
        payload = TokenService.verify_token(request.refreshToken, token_type="refresh")
        user_id = payload.get("sub")

        user = await auth_service.user_service.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在"
            )

        # 生成新的 token
        access_token = TokenService.create_access_token(user.id)
        refresh_token_new = TokenService.create_refresh_token(user.id)

        return AuthResponse(
            token=access_token,
            refresh_token=refresh_token_new,
            user=UserResponse.model_validate(user),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的刷新令牌"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """获取当前用户信息"""
    return UserResponse.model_validate(current_user)

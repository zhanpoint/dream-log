"""
OAuth 认证 API 路由
"""

from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import get_auth_service
from app.models.user import RegistrationMethod
from app.schemas.auth import AuthResponse, GoogleCallbackRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])


@router.get("/google/init")
async def init_google_oauth() -> dict[str, str]:
    """获取 Google OAuth 授权 URL"""
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth 未配置",
        )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "email profile",
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return {"authUrl": auth_url}


@router.post("/google/callback", response_model=AuthResponse)
async def google_oauth_callback(
    request: GoogleCallbackRequest, auth_service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    """处理 Google OAuth 回调"""
    if (
        not settings.google_client_id
        or not settings.google_client_secret
        or not settings.google_redirect_uri
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth 未配置",
        )

    # 1. 用 code 换取 access_token
    # 不读取 HTTP(S)_PROXY 等环境变量，避免容器误走代理导致连接异常
    # 使用 AI_PROXY_URL 作为可选代理
    proxy_url = settings.ai_proxy_url
    async with httpx.AsyncClient(
        trust_env=False,
        proxy=proxy_url,
        timeout=httpx.Timeout(20.0, connect=10.0),
    ) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": request.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Google 授权失败"
            )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        # 2. 使用 access_token 获取用户信息
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_info_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="获取用户信息失败"
            )

        user_info = user_info_response.json()

    # 3. 创建或登录用户
    email = user_info.get("email")
    google_id = user_info.get("id")
    name = user_info.get("name")
    avatar = user_info.get("picture")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="无法获取用户信息"
        )

    # 检查用户是否已存在
    user = await auth_service.user_service.get_by_google_id(google_id)
    if not user:
        user = await auth_service.user_service.get_by_email(email)

    if not user:
        # 创建新用户
        user = await auth_service.user_service.create_user(
            email=email,
            name=name,
            google_id=google_id,
            avatar=avatar,
            registration_method=RegistrationMethod.GOOGLE,
        )
    elif not user.google_id:
        # 绑定 Google 账号
        user.google_id = google_id
        user.avatar = user.avatar or avatar
        await auth_service.db.commit()

    return auth_service._create_auth_response(user)

"""
OAuth 认证 API 路由
"""

import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.deps import get_auth_service
from app.core.redis import get_redis
from app.models.user import RegistrationMethod
from app.schemas.auth import AuthResponse, GoogleCallbackRequest, WeChatCallbackRequest
from app.services.auth_service import AuthService
from app.services.outbound_http import create_outbound_async_client

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])
WECHAT_OAUTH_STATE_TTL_SECONDS = 600


def _wechat_oauth_state_key(state: str) -> str:
    return f"oauth:wechat:state:{state}"


async def _save_wechat_oauth_state(redis: Redis, state: str) -> None:
    await redis.setex(_wechat_oauth_state_key(state), WECHAT_OAUTH_STATE_TTL_SECONDS, "1")


async def _consume_wechat_oauth_state(redis: Redis, state: str) -> bool:
    async with redis.pipeline(transaction=True) as pipe:
        pipe.get(_wechat_oauth_state_key(state))
        pipe.delete(_wechat_oauth_state_key(state))
        raw, _ = await pipe.execute()
    return bool(raw)


def _build_wechat_placeholder_email(identity: str) -> str:
    return f"wechat_{identity}@oauth.dreamlog.local"


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


@router.get("/wechat/init")
async def init_wechat_oauth(redis: Redis = Depends(get_redis)) -> dict[str, str]:
    """获取微信网站扫码登录授权 URL"""
    if not settings.wechat_open_app_id or not settings.wechat_open_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WeChat OAuth 未配置",
        )

    state = secrets.token_urlsafe(24)
    await _save_wechat_oauth_state(redis, state)

    params = {
        "appid": settings.wechat_open_app_id,
        "redirect_uri": settings.wechat_open_redirect_uri,
        "response_type": "code",
        "scope": "snsapi_login",
        "state": state,
    }

    auth_url = f"https://open.weixin.qq.com/connect/qrconnect?{urlencode(params)}#wechat_redirect"

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
    # Google API 出站与 AI 一致，仅使用 AI_PROXY_URL
    try:
        async with create_outbound_async_client(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
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
    except httpx.ConnectError:
        raise

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


@router.post("/wechat/callback", response_model=AuthResponse)
async def wechat_oauth_callback(
    request: WeChatCallbackRequest,
    auth_service: AuthService = Depends(get_auth_service),
    redis: Redis = Depends(get_redis),
) -> AuthResponse:
    """处理微信网站扫码登录回调"""
    if (
        not settings.wechat_open_app_id
        or not settings.wechat_open_app_secret
        or not settings.wechat_open_redirect_uri
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WeChat OAuth 未配置",
        )

    if not await _consume_wechat_oauth_state(redis, request.state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="微信登录状态已失效，请重新扫码",
        )

    async with create_outbound_async_client(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
        token_response = await client.get(
            "https://api.weixin.qq.com/sns/oauth2/access_token",
            params={
                "appid": settings.wechat_open_app_id,
                "secret": settings.wechat_open_app_secret,
                "code": request.code,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        open_id = token_data.get("openid")
        union_id = token_data.get("unionid")
        error_code = token_data.get("errcode")

        if token_response.status_code != 200 or error_code or not access_token or not open_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="微信授权失败",
            )

        user_info_response = await client.get(
            "https://api.weixin.qq.com/sns/userinfo",
            params={
                "access_token": access_token,
                "openid": open_id,
                "lang": "zh_CN",
            },
        )
        user_info = user_info_response.json()
        user_error_code = user_info.get("errcode")
        if user_info_response.status_code != 200 or user_error_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="获取微信用户信息失败",
            )

    nickname = user_info.get("nickname") or "微信用户"
    avatar = user_info.get("headimgurl")
    union_id = user_info.get("unionid") or union_id

    user = None
    if union_id:
        user = await auth_service.user_service.get_by_wechat_union_id(union_id)
    if not user:
        user = await auth_service.user_service.get_by_wechat_open_id(open_id)

    if not user:
        identity = union_id or open_id
        user = await auth_service.user_service.create_user(
            email=_build_wechat_placeholder_email(identity),
            name=nickname,
            wechat_open_id=open_id,
            wechat_union_id=union_id,
            avatar=avatar,
            registration_method=RegistrationMethod.WECHAT,
        )
    else:
        if not user.wechat_open_id:
            user.wechat_open_id = open_id
        if union_id and not user.wechat_union_id:
            user.wechat_union_id = union_id
        if avatar and not user.avatar:
            user.avatar = avatar
        await auth_service.db.commit()

    return auth_service._create_auth_response(user)

"""
FastAPI 依赖注入
"""

from collections.abc import AsyncGenerator

from arq.connections import ArqRedis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.redis import get_arq_redis, get_redis
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.token_service import TokenService
from app.services.user_service import UserService

# HTTP Bearer Token
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    async with async_session_maker() as session:
        yield session


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    arq_redis: ArqRedis = Depends(get_arq_redis),
) -> AuthService:
    """获取认证服务"""
    return AuthService(db, redis, arq_redis)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """获取当前登录用户"""
    try:
        token = credentials.credentials
        payload = TokenService.verify_token(token, token_type="access")
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的令牌"
            )

        user_service = UserService(db)
        user = await user_service.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在"
            )

        return user

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌验证失败"
        )

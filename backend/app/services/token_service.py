"""
JWT Token 服务 - 处理 Token 的创建和验证
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings

# 东八区时区
SHANGHAI_TZ = timezone(timedelta(hours=8))


class TokenService:
    """JWT Token 服务类"""

    @staticmethod
    def create_access_token(
        user_id: UUID | str, expires_delta: timedelta | None = None
    ) -> str:
        """
        创建访问令牌

        Args:
            user_id: 用户 ID
            expires_delta: 过期时间增量（可选）

        Returns:
            str: JWT token
        """
        if expires_delta:
            expire = datetime.now(SHANGHAI_TZ) + expires_delta
        else:
            expire = datetime.now(SHANGHAI_TZ) + timedelta(
                minutes=settings.access_token_expire_minutes
            )

        payload = {"sub": str(user_id), "exp": expire, "type": "access"}
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def create_refresh_token(user_id: UUID | str) -> str:
        """
        创建刷新令牌

        Args:
            user_id: 用户 ID

        Returns:
            str: JWT refresh token
        """
        expire = datetime.now(SHANGHAI_TZ) + timedelta(
            days=settings.refresh_token_expire_days
        )
        payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> dict:
        """
        验证并解析 Token

        Args:
            token: JWT token
            token_type: token 类型 ("access" 或 "refresh")

        Returns:
            dict: token payload

        Raises:
            ValueError: token 验证失败
        """
        try:
            payload = jwt.decode(
                token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
            )

            if payload.get("type") != token_type:
                raise ValueError(f"Invalid token type: expected {token_type}")

            return payload
        except JWTError as e:
            raise ValueError(f"Token verification failed: {str(e)}")

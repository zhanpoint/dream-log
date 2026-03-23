"""
认证服务 - 处理用户注册、登录、密码重置等认证相关业务逻辑
"""

from arq.connections import ArqRedis
from fastapi import HTTPException, status
import anyio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import AuthResponse, UserResponse
from app.services.email_verification_service import EmailVerificationService
from app.services.password_service import PasswordService
from app.services.token_service import TokenService
from app.services.user_service import UserService


class AuthService:
    """认证服务类"""

    def __init__(self, db: AsyncSession, redis: Redis, arq_redis: ArqRedis):
        self.db = db
        self.user_service = UserService(db)
        self.email_service = EmailVerificationService(redis, arq_redis)

    async def check_email_exists(self, email: str) -> bool:
        """检查邮箱是否已注册"""
        user = await self.user_service.get_by_email(email)
        return user is not None

    async def get_user_auth_info(self, email: str) -> dict[str, bool]:
        """
        获取用户认证信息
        
        Returns:
            dict: {"exists": bool, "has_password": bool}
        """
        user = await self.user_service.get_by_email(email)
        if not user:
            return {"exists": False, "has_password": False}
        return {
            "exists": True,
            "has_password": bool(user.hashed_password)
        }

    async def signup_with_code(
        self, email: str, code: str, name: str | None
    ) -> AuthResponse:
        """
        使用验证码注册

        Args:
            email: 邮箱
            code: 验证码
            name: 用户名（可选）

        Returns:
            AuthResponse: 认证响应

        Raises:
            HTTPException: 验证码无效或邮箱已注册
        """
        # 验证验证码
        if not await self.email_service.verify_code(email, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期"
            )

        # 检查邮箱是否已注册
        if await self.check_email_exists(email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册")

        # 创建用户
        user = await self.user_service.create_user(email, name=name)

        # 生成 Token
        return self._create_auth_response(user)

    async def signup_with_password(
        self, email: str, password: str, code: str, name: str | None
    ) -> AuthResponse:
        """
        使用密码注册

        Args:
            email: 邮箱
            password: 密码
            code: 验证码
            name: 用户名（可选）

        Returns:
            AuthResponse: 认证响应

        Raises:
            HTTPException: 密码强度不足、验证码无效或邮箱已注册
        """
        # 验证密码强度
        validation = PasswordService.validate_password_strength(password)
        if not validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=validation["errors"][0]
            )

        # 验证验证码
        if not await self.email_service.verify_code(email, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期"
            )

        # 检查邮箱是否已注册
        if await self.check_email_exists(email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册")

        # 创建用户
        user = await self.user_service.create_user(email, password=password, name=name)

        return self._create_auth_response(user)

    async def login_with_password(self, email: str, password: str) -> AuthResponse:
        """
        使用密码登录

        Args:
            email: 邮箱
            password: 密码

        Returns:
            AuthResponse: 认证响应

        Raises:
            HTTPException: 邮箱或密码错误
        """
        user = await self.user_service.get_by_email(email)
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误"
            )

        ok = await anyio.to_thread.run_sync(
            PasswordService.verify_password, password, user.hashed_password
        )
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误"
            )

        return self._create_auth_response(user)

    async def login_with_code(self, email: str, code: str) -> AuthResponse:
        """
        使用验证码登录

        Args:
            email: 邮箱
            code: 验证码

        Returns:
            AuthResponse: 认证响应

        Raises:
            HTTPException: 验证码无效或用户不存在
        """
        # 验证验证码
        if not await self.email_service.verify_code(email, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期"
            )

        # 检查用户是否存在
        user = await self.user_service.get_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

        return self._create_auth_response(user)

    async def reset_password(
        self, email: str, code: str, new_password: str
    ) -> AuthResponse:
        """
        重置密码

        Args:
            email: 邮箱
            code: 验证码
            new_password: 新密码

        Returns:
            AuthResponse: 认证响应

        Raises:
            HTTPException: 密码强度不足、验证码无效或用户不存在
        """
        # 验证密码强度
        validation = PasswordService.validate_password_strength(new_password)
        if not validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=validation["errors"][0]
            )

        # 验证验证码
        if not await self.email_service.verify_code(email, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期"
            )

        # 获取用户
        user = await self.user_service.get_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

        # 更新密码
        user = await self.user_service.update_password(user, new_password)

        return self._create_auth_response(user)

    def _create_auth_response(self, user: User) -> AuthResponse:
        """
        创建认证响应

        Args:
            user: 用户对象

        Returns:
            AuthResponse: 认证响应
        """
        access_token = TokenService.create_access_token(user.id)
        refresh_token = TokenService.create_refresh_token(user.id)

        return AuthResponse(
            token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

"""
用户服务层
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, RegistrationMethod
from app.schemas.user import UpdateProfileRequest
from app.services.oss_service import delete_oss_file_from_url
from app.services.password_service import PasswordService
from app.services.username_service import check_username_available, generate_username
from app.core.redis import get_redis, get_arq_redis


class UserService:
    """用户服务类（兼容旧版 AuthService）"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        """通过邮箱获取用户"""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_google_id(self, google_id: str) -> User | None:
        """通过 Google ID 获取用户"""
        result = await self.db.execute(select(User).where(User.google_id == google_id))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID | str) -> User | None:
        """通过 ID 获取用户"""
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_user(
        self,
        email: str,
        password: str | None = None,
        name: str | None = None,
        google_id: str | None = None,
        avatar: str | None = None,
    ) -> User:
        """创建用户"""
        # 先生成 UUID
        user_id = uuid.uuid4()
        
        user = User(
            id=user_id,
            email=email,
            username=name,
            google_id=google_id,
            avatar=avatar,
            registration_method=RegistrationMethod.GOOGLE if google_id else RegistrationMethod.EMAIL,
        )

        if password:
            user.hashed_password = PasswordService.hash_password(password)

        # 如果没有提供用户名，自动生成
        if not user.username:
            user.username = await generate_username(user.id, self.db)

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user


# ============= 独立的用户管理函数 =============


async def get_user_by_id(user_id: uuid.UUID, db: AsyncSession) -> User:
    """
    通过ID获取用户
    
    Args:
        user_id: 用户ID
        db: 数据库会话
        
    Returns:
        用户对象
        
    Raises:
        HTTPException: 用户不存在
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )
    
    return user


async def update_profile(
    user_id: uuid.UUID,
    profile_data: UpdateProfileRequest,
    db: AsyncSession,
) -> User:
    """
    更新用户个人资料
    
    Args:
        user_id: 用户ID
        profile_data: 资料数据
        db: 数据库会话
        
    Returns:
        更新后的用户对象
        
    Raises:
        HTTPException: 用户名已被占用
    """
    user = await get_user_by_id(user_id, db)
    
    # 检查用户名唯一性
    if profile_data.username is not None:
        is_available = await check_username_available(
            profile_data.username,
            db,
            exclude_user_id=user_id,
        )
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被占用",
            )
        user.username = profile_data.username
    
    # 更新其他字段
    if profile_data.bio is not None:
        user.bio = profile_data.bio
    
    if profile_data.birthday is not None:
        user.birthday = profile_data.birthday
    
    await db.commit()
    await db.refresh(user)
    
    return user


async def update_avatar(
    user_id: uuid.UUID,
    avatar_url: str,
    db: AsyncSession,
) -> User:
    """
    更新用户头像，并删除旧头像文件
    
    Args:
        user_id: 用户ID
        avatar_url: 新头像URL
        db: 数据库会话
        
    Returns:
        更新后的用户对象
    """
    user = await get_user_by_id(user_id, db)
    
    # 如果有旧头像且是OSS上的文件，尝试删除（头像在 public bucket）
    if user.avatar:
        delete_oss_file_from_url(user.avatar, user_id, bucket_type="public")
    
    user.avatar = avatar_url
    
    await db.commit()
    await db.refresh(user)
    
    return user


async def change_password(
    user_id: uuid.UUID,
    old_password: str | None,
    new_password: str,
    verification_code: str | None,
    db: AsyncSession,
) -> None:
    """
    修改用户密码

        Args:
        user_id: 用户ID
        old_password: 旧密码（可选）
            new_password: 新密码
        verification_code: 验证码（可选）
        db: 数据库会话
        
    Raises:
        HTTPException: 验证失败或密码错误
    """
    user = await get_user_by_id(user_id, db)
    
    # 验证身份：需要旧密码或验证码
    if old_password:
        # 使用旧密码验证
        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="账户未设置密码，请使用验证码验证",
            )
        if not PasswordService.verify_password(old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="旧密码错误",
            )
    elif verification_code:
        # 使用验证码验证
        from app.services.email_verification_service import EmailVerificationService
        redis = get_redis()
        arq_redis = get_arq_redis()
        email_service = EmailVerificationService(redis, arq_redis)
        is_valid = await email_service.verify_code(user.email, verification_code)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码无效或已过期",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请提供旧密码或验证码",
        )
    
    # 更新密码
    user.hashed_password = PasswordService.hash_password(new_password)
    
    await db.commit()


async def change_email(
    user_id: uuid.UUID,
    new_email: str,
    verification_code: str,
    db: AsyncSession,
) -> User:
    """
    修改用户邮箱
    
    Args:
        user_id: 用户ID
        new_email: 新邮箱
        verification_code: 验证码
        db: 数据库会话

        Returns:
        更新后的用户对象
        
    Raises:
        HTTPException: 验证失败或邮箱已被占用
        """
    user = await get_user_by_id(user_id, db)
    
    # 验证新邮箱的验证码
    from app.services.email_verification_service import EmailVerificationService
    redis = get_redis()
    arq_redis = get_arq_redis()
    email_service = EmailVerificationService(redis, arq_redis)
    is_valid = await email_service.verify_code(new_email, verification_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码无效或已过期",
        )
    
    # 检查新邮箱是否已被占用
    result = await db.execute(select(User).where(User.email == new_email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被使用",
        )
    
    user.email = new_email
    
    await db.commit()
    await db.refresh(user)
    
    return user

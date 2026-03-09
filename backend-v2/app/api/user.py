"""
用户 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    AvatarUploadSignatureRequest,
    AvatarUploadSignatureResponse,
    ChangeEmailRequest,
    ChangePasswordRequest,
    CheckUsernameRequest,
    CheckUsernameResponse,
    MessageResponse,
    UpdateAvatarRequest,
    UpdateProfileRequest,
    UserProfileResponse,
)
from app.services.user_service import (
    change_email,
    change_password,
    update_avatar,
    update_profile,
)
from app.services.username_service import check_username_available

router = APIRouter(prefix="/user", tags=["用户"])


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    获取当前用户完整信息
    """
    return current_user


@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    更新个人资料
    """
    return await update_profile(current_user.id, profile_data, db)


@router.post("/avatar/signature", response_model=AvatarUploadSignatureResponse)
async def get_avatar_upload_signature(
    request: AvatarUploadSignatureRequest,
    current_user: User = Depends(get_current_user),
) -> AvatarUploadSignatureResponse:
    """
    获取头像上传预签名 URL
    """
    try:
        # 延迟导入，避免模块级导入异常导致整个应用启动失败
        from app.services.oss_service import get_oss_service

        oss_service = get_oss_service()
        result = await oss_service.generate_avatar_upload_signature(
            user_id=current_user.id,
            filename=request.file_name,
            content_type=request.content_type,
        )
        return AvatarUploadSignatureResponse(**result)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成上传签名失败: {str(e)}",
        )


@router.put("/avatar", response_model=UserProfileResponse)
async def update_user_avatar(
    request: UpdateAvatarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    更新用户头像 URL
    """
    return await update_avatar(current_user.id, request.avatar_url, db)


@router.put("/password", response_model=MessageResponse)
async def change_user_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    修改密码
    """
    await change_password(
        current_user.id,
        request.old_password,
        request.new_password,
        request.verification_code,
        db,
    )
    return MessageResponse(message="密码修改成功")


@router.put("/email", response_model=UserProfileResponse)
async def change_user_email(
    request: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    修改邮箱
    """
    return await change_email(
        current_user.id,
        request.new_email,
        request.verification_code,
        db,
    )


@router.post("/username/check", response_model=CheckUsernameResponse)
async def check_username(
    request: CheckUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckUsernameResponse:
    """
    检查用户名是否可用
    """
    is_available = await check_username_available(
        request.username,
        db,
        exclude_user_id=current_user.id,
    )
    
    if is_available:
        return CheckUsernameResponse(
            available=True,
            message="用户名可用",
        )
    else:
        return CheckUsernameResponse(
            available=False,
            message="用户名已被占用",
        )

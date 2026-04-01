"""
Passkey / WebAuthn API
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.deps import get_auth_service, get_current_user, get_passkey_service
from app.models.user import User
from app.schemas.auth import AuthResponse, MessageResponse
from app.schemas.passkey import (
    PasskeyEnrollVerifyRequest,
    PasskeyItem,
    PasskeyOptionsResponse,
    PasskeyRenameRequest,
    PasskeyVerifyRequest,
)
from app.services.auth_service import AuthService
from app.services.passkey_service import PasskeyService

router = APIRouter(prefix="/auth/passkey", tags=["Passkey"])


@router.post("/authentication/options", response_model=PasskeyOptionsResponse)
async def passkey_authentication_options(
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> PasskeyOptionsResponse:
    """获取无账号输入登录的认证 options"""
    data = await passkey_service.generate_authentication_options()
    return PasskeyOptionsResponse.model_validate(data)


@router.post("/authentication/verify", response_model=AuthResponse)
async def passkey_authentication_verify(
    request: Request,
    body: PasskeyVerifyRequest,
    auth_service: AuthService = Depends(get_auth_service),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> AuthResponse:
    """校验 assertion 并签发 JWT"""
    try:
        user_id = await passkey_service.verify_authentication(
            request=request,
            ceremony_id=body.ceremony_id,
            credential_json=body.credential,
        )
        user = await auth_service.user_service.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
        # 显式提交，确保 sign_count / last_used_at 的更新与认证流程一致落库
        await passkey_service.db.commit()
        return auth_service._create_auth_response(user)
    except HTTPException:
        await passkey_service.db.rollback()
        raise
    except Exception:
        await passkey_service.db.rollback()
        raise


@router.post("/enroll/send-code", response_model=MessageResponse)
async def passkey_enroll_send_code(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    """发送“添加通行密钥”的邮箱验证码（已登录态）"""
    allowed, wait_time = await auth_service.email_service.check_rate_limit(current_user.email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"发送过于频繁,请 {wait_time} 秒后再试",
        )
    await auth_service.email_service.send_code(current_user.email, "passkey_enroll")
    return MessageResponse(message="验证码发送成功", expires_in=300)


@router.post("/enroll/verify-code", response_model=MessageResponse)
async def passkey_enroll_verify_code(
    body: PasskeyEnrollVerifyRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> MessageResponse:
    """验证邮箱验证码，写入一次性 enroll_ok 票据（用于注册 passkey）"""
    valid = await auth_service.email_service.verify_code(current_user.email, body.code)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期")
    await passkey_service.set_enroll_ok(str(current_user.id))
    return MessageResponse(message="验证成功，请继续添加通行密钥", expires_in=600)


@router.post("/registration/options", response_model=PasskeyOptionsResponse)
async def passkey_registration_options(
    current_user: User = Depends(get_current_user),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> PasskeyOptionsResponse:
    """获取注册 options（必须先完成 enroll step-up）"""
    display_name = current_user.username or current_user.email
    data = await passkey_service.generate_registration_options(
        user_id=str(current_user.id),
        user_email=current_user.email,
        display_name=display_name,
    )
    return PasskeyOptionsResponse.model_validate(data)


@router.post("/registration/verify", response_model=MessageResponse)
async def passkey_registration_verify(
    request: Request,
    body: PasskeyVerifyRequest,
    current_user: User = Depends(get_current_user),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> MessageResponse:
    """校验 attestation 并落库（校验时会消费 enroll_ok 票据）"""
    try:
        model = await passkey_service.verify_registration(
            request=request,
            ceremony_id=body.ceremony_id,
            credential_json=body.credential,
        )
        # 绑定必须是当前用户
        if str(model.user_id) != str(current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权操作")
        # 显式提交，确保仅在真实写库成功后返回 200
        await passkey_service.db.commit()
    except HTTPException:
        await passkey_service.db.rollback()
        raise
    except Exception:
        await passkey_service.db.rollback()
        raise
    return MessageResponse(message="通行密钥添加成功")


@router.get("", response_model=list[PasskeyItem])
async def list_passkeys(
    current_user: User = Depends(get_current_user),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> list[PasskeyItem]:
    items = await passkey_service.list_user_passkeys(str(current_user.id))
    return [
        PasskeyItem(
            credential_id=i.id,
            name=i.name,
            aaguid=i.aaguid,
            transports=i.transports,
            backup_eligible=i.backup_eligible,
            backed_up=i.backed_up,
            created_at=i.created_at,
            last_used_at=i.last_used_at,
        )
        for i in items
    ]


@router.patch("/{credential_id}", response_model=MessageResponse)
async def rename_passkey(
    credential_id: str,
    body: PasskeyRenameRequest,
    current_user: User = Depends(get_current_user),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> MessageResponse:
    await passkey_service.rename_passkey(
        user_id=str(current_user.id), credential_id=credential_id, name=body.name
    )
    return MessageResponse(message="已更新通行密钥名称")


@router.delete("/{credential_id}", response_model=MessageResponse)
async def delete_passkey(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    passkey_service: PasskeyService = Depends(get_passkey_service),
) -> MessageResponse:
    await passkey_service.delete_passkey(user_id=str(current_user.id), credential_id=credential_id)
    return MessageResponse(message="通行密钥已删除")

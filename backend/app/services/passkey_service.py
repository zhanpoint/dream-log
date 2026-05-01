"""
Passkey / WebAuthn 服务

实现要点：
- 使用 Redis 存储一次性 ceremony（challenge + 目的 + user_id 可选），TTL=5分钟，verify 后即删除
- 使用 WebAuthn server-side 库完成 options 生成与响应校验
"""

from __future__ import annotations

import base64
import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from uuid import UUID

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import (
    parse_authentication_credential_json,
    parse_registration_credential_json,
)
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.core.config import settings
from app.models.passkey_credential import PasskeyCredential
from app.models.user import User

SHANGHAI_TZ = timezone(timedelta(hours=8))


def _shanghai_now() -> datetime:
    return datetime.now(SHANGHAI_TZ)


class PasskeyService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    # -------------------------
    # Redis ceremony storage
    # -------------------------
    @staticmethod
    def _ceremony_key(ceremony_id: str) -> str:
        return f"passkey:ceremony:{ceremony_id}"

    async def _save_ceremony(
        self,
        *,
        ceremony_id: str,
        purpose: str,
        challenge: str,
        rp_id: str,
        user_id: str | None,
        ttl_seconds: int = 300,
    ) -> None:
        key = self._ceremony_key(ceremony_id)
        payload = {"purpose": purpose, "challenge": challenge, "rp_id": rp_id, "user_id": user_id}
        await self.redis.setex(key, ttl_seconds, json.dumps(payload, separators=(",", ":")))

    async def _consume_ceremony(self, ceremony_id: str) -> dict:
        key = self._ceremony_key(ceremony_id)
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.get(key)
            pipe.delete(key)
            raw, _ = await pipe.execute()
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="通行密钥请求已过期，请重试"
            )
        return json.loads(raw)

    # -------------------------
    # Step-up (email code) ticket
    # -------------------------
    @staticmethod
    def _enroll_ok_key(user_id: str) -> str:
        return f"passkey:enroll_ok:{user_id}"

    async def set_enroll_ok(self, user_id: str, ttl_seconds: int = 600) -> None:
        await self.redis.setex(self._enroll_ok_key(user_id), ttl_seconds, "1")

    async def check_enroll_ok(self, user_id: str) -> bool:
        return bool(await self.redis.get(self._enroll_ok_key(user_id)))

    async def clear_enroll_ok(self, user_id: str) -> None:
        await self.redis.delete(self._enroll_ok_key(user_id))

    # -------------------------
    # Options generation
    # -------------------------
    async def generate_authentication_options(self, request: Request) -> dict:
        return await self.generate_authentication_options_for_email(request=request, email=None)

    async def generate_authentication_options_for_email(
        self, *, request: Request, email: str | None
    ) -> dict:
        rp_id = self._resolve_rp_id(request)
        allow_credentials = None

        if email:
            user_row = await self.db.execute(select(User).where(User.email == email))
            user = user_row.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

            credential_rows = await self.db.execute(
                select(PasskeyCredential.id, PasskeyCredential.transports).where(
                    PasskeyCredential.user_id == user.id
                )
            )
            credentials = credential_rows.all()
            if not credentials:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="当前账号未绑定通行密钥",
                )

            allow_credentials = [
                PublicKeyCredentialDescriptor(
                    id=_b64url_to_bytes(cred_id),
                    transports=_to_authenticator_transports(transports),
                )
                for cred_id, transports in credentials
            ]

        options = generate_authentication_options(
            rp_id=rp_id,
            user_verification=UserVerificationRequirement.REQUIRED,
            allow_credentials=allow_credentials or None,
        )
        options_json = json.loads(options_to_json(options))

        ceremony_id = secrets.token_urlsafe(32)
        await self._save_ceremony(
            ceremony_id=ceremony_id,
            purpose="authentication",
            challenge=options_json["challenge"],
            rp_id=rp_id,
            user_id=None,
        )

        return {"ceremony_id": ceremony_id, "publicKey": options_json}

    async def generate_registration_options(
        self, *, request: Request, user_id: str, user_email: str, display_name: str
    ) -> dict:
        rp_id = self._resolve_rp_id(request)
        # enroll_ok 票据不在这里消费，避免用户误触后无法继续；在 verify 时一次性消费
        if not await self.check_enroll_ok(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要先完成邮箱验证码验证才能添加通行密钥",
            )

        user_uuid = UUID(user_id)
        existing = await self.db.execute(
            select(PasskeyCredential.id, PasskeyCredential.transports).where(
                PasskeyCredential.user_id == user_uuid
            )
        )
        exclude_credentials: list[PublicKeyCredentialDescriptor] = []
        for cred_id, transports in existing.all():
            exclude_credentials.append(
                PublicKeyCredentialDescriptor(
                    id=_b64url_to_bytes(cred_id),
                    transports=_to_authenticator_transports(transports),
                )
            )

        options = generate_registration_options(
            rp_name=settings.passkey_rp_name,
            rp_id=rp_id,
            user_id=_user_id_bytes(user_id),
            user_name=user_email,
            user_display_name=display_name,
            attestation=AttestationConveyancePreference.NONE,
            exclude_credentials=exclude_credentials or None,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )
        options_json = json.loads(options_to_json(options))
        ceremony_id = secrets.token_urlsafe(32)
        await self._save_ceremony(
            ceremony_id=ceremony_id,
            purpose="registration",
            challenge=options_json["challenge"],
            rp_id=rp_id,
            user_id=user_id,
        )
        return {"ceremony_id": ceremony_id, "publicKey": options_json}

    # -------------------------
    # Verification
    # -------------------------
    @staticmethod
    def _pick_expected_origin(request: Request) -> str:
        origin = request.headers.get("origin")
        if origin and origin in settings.passkey_origins:
            return origin
        # 兜底：若没有 Origin（某些同源场景/代理），使用配置的第一个 origin
        return settings.passkey_origins[0]

    @staticmethod
    def _resolve_rp_id(request: Request) -> str:
        # 显式配置优先（生产推荐）
        if settings.passkey_rp_id:
            return settings.passkey_rp_id.strip()
        # 未显式配置时，按当前请求 origin 的 host 动态推导，避免被 localhost 默认值污染
        origin = request.headers.get("origin")
        if origin:
            host = urlparse(origin).hostname
            if host:
                return host
        # 反向代理场景兜底：优先 x-forwarded-host
        forwarded_host = request.headers.get("x-forwarded-host")
        if forwarded_host:
            host = forwarded_host.split(",")[0].strip().split(":")[0]
            if host:
                return host
        # 直接取 Host 头（本地开发常见）
        host_header = request.headers.get("host")
        if host_header:
            host = host_header.split(":")[0].strip()
            if host:
                return host
        expected_origin = PasskeyService._pick_expected_origin(request)
        host = urlparse(expected_origin).hostname
        if host:
            return host
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Passkey RP ID 配置错误，请检查 PASSKEY_RP_ID",
        )

    async def verify_registration(self, *, request: Request, ceremony_id: str, credential_json: dict) -> PasskeyCredential:
        ceremony = await self._consume_ceremony(ceremony_id)
        if ceremony.get("purpose") != "registration":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的通行密钥请求")
        user_id = ceremony.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的通行密钥请求")

        # 强制 step-up（注册成功后再清除票据，避免一次失败导致用户重走验证码）
        if not await self.check_enroll_ok(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要先完成邮箱验证码验证才能添加通行密钥",
            )

        expected_origin = self._pick_expected_origin(request)
        expected_challenge = _b64url_to_bytes(ceremony["challenge"])
        expected_rp_id = str(ceremony.get("rp_id") or self._resolve_rp_id(request))

        credential = parse_registration_credential_json(credential_json)
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
            require_user_verification=True,
        )

        cred_id_b64 = _credential_id_to_b64url(verification.credential_id)
        public_key = verification.credential_public_key
        sign_count = verification.sign_count
        aaguid = getattr(verification, "aaguid", None)
        backed_up = getattr(verification, "credential_backed_up", None)
        backup_eligible = getattr(verification, "credential_backup_eligible", None)
        transports = None
        try:
            transports = credential.response.transports
        except Exception:
            transports = None

        transport_values = _transports_to_str_list(transports)
        model = PasskeyCredential(
            id=cred_id_b64,
            user_id=UUID(user_id),
            public_key=public_key,
            sign_count=sign_count,
            aaguid=str(aaguid) if aaguid else None,
            transports=transport_values,
            backed_up=backed_up,
            backup_eligible=backup_eligible,
            name=_default_passkey_name(transport_values),
            created_at=_shanghai_now(),
        )
        self.db.add(model)
        await self.clear_enroll_ok(user_id)
        return model

    async def verify_authentication(self, *, request: Request, ceremony_id: str, credential_json: dict) -> str:
        ceremony = await self._consume_ceremony(ceremony_id)
        if ceremony.get("purpose") != "authentication":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的通行密钥请求")

        expected_origin = self._pick_expected_origin(request)
        expected_challenge = _b64url_to_bytes(ceremony["challenge"])
        expected_rp_id = str(ceremony.get("rp_id") or self._resolve_rp_id(request))

        credential = parse_authentication_credential_json(credential_json)
        cred_id = credential.id

        row = await self.db.execute(select(PasskeyCredential).where(PasskeyCredential.id == cred_id))
        model = row.scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通行密钥不存在或已被移除")

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
            credential_public_key=model.public_key,
            credential_current_sign_count=model.sign_count,
            require_user_verification=True,
        )

        # 更新 sign_count / last_used_at
        new_sign_count = getattr(verification, "new_sign_count", None)
        if isinstance(new_sign_count, int):
            model.sign_count = new_sign_count
        model.last_used_at = _shanghai_now()
        await self.db.flush()

        return str(model.user_id)

    # -------------------------
    # Management
    # -------------------------
    async def list_user_passkeys(self, user_id: str) -> list[PasskeyCredential]:
        user_uuid = UUID(user_id)
        rows = await self.db.execute(
            select(PasskeyCredential)
            .where(PasskeyCredential.user_id == user_uuid)
            .order_by(PasskeyCredential.created_at.desc())
        )
        return list(rows.scalars().all())

    async def rename_passkey(self, *, user_id: str, credential_id: str, name: str) -> None:
        user_uuid = UUID(user_id)
        result = await self.db.execute(
            update(PasskeyCredential)
            .where(PasskeyCredential.user_id == user_uuid, PasskeyCredential.id == credential_id)
            .values(name=name)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通行密钥不存在")

    async def delete_passkey(self, *, user_id: str, credential_id: str) -> None:
        user_uuid = UUID(user_id)
        result = await self.db.execute(
            delete(PasskeyCredential).where(
                PasskeyCredential.user_id == user_uuid, PasskeyCredential.id == credential_id
            )
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通行密钥不存在")


def _user_id_bytes(user_id: str) -> bytes:
    # 用户主键是 UUID（字符串形式），bytes 长度 16，满足 WebAuthn <=64 bytes 的要求
    import uuid as _uuid

    return _uuid.UUID(str(user_id)).bytes


def _b64url_to_bytes(value: str) -> bytes:
    # 由 webauthn 库提供的 helper，避免重复实现
    from webauthn import base64url_to_bytes

    return base64url_to_bytes(value)


def _to_authenticator_transports(transports: list[str] | None) -> list:
    if not transports:
        return []
    from webauthn.helpers.structs import AuthenticatorTransport

    out: list[AuthenticatorTransport] = []
    for t in transports:
        try:
            out.append(AuthenticatorTransport(t))
        except Exception:
            continue
    return out


def _transports_to_str_list(transports: list | None) -> list[str] | None:
    if not transports:
        return None
    out: list[str] = []
    for t in transports:
        value = getattr(t, "value", None)
        out.append(value if isinstance(value, str) else str(t))
    return out


def _credential_id_to_b64url(value: str | bytes) -> str:
    if isinstance(value, str):
        return value
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _default_passkey_name(transports: list[str] | None) -> str:
    if not transports:
        return "通行密钥"
    if "internal" in transports:
        return "Windows Hello"
    if "usb" in transports or "nfc" in transports or "ble" in transports:
        return "安全密钥"
    if "hybrid" in transports:
        return "手机通行密钥"
    return "通行密钥"

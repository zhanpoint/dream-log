"""
Passkey / WebAuthn Schemas
"""

from datetime import datetime

from pydantic import BaseModel, Field


class PasskeyOptionsResponse(BaseModel):
    """返回给前端的 WebAuthn options（已 JSON 化）"""

    ceremony_id: str
    publicKey: dict


class PasskeyVerifyRequest(BaseModel):
    ceremony_id: str
    credential: dict = Field(..., description="浏览器返回的 PublicKeyCredential（JSON 化）")


class PasskeyEnrollVerifyRequest(BaseModel):
    code: str = Field(..., pattern=r"^\d{6}$", description="6位数字验证码")


class PasskeyItem(BaseModel):
    credential_id: str
    name: str | None
    aaguid: str | None
    transports: list[str] | None
    backup_eligible: bool | None
    backed_up: bool | None
    created_at: datetime
    last_used_at: datetime | None


class PasskeyRenameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


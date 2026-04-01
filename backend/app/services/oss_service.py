"""阿里云 OSS 统一文件服务。"""

from __future__ import annotations

import asyncio
import mimetypes
import os
import uuid
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse
from urllib.parse import unquote

import oss2

from app.core.config import settings

BucketType = Literal["public", "private"]


@dataclass(slots=True)
class UploadedObject:
    object_key: str
    content_type: str
    size: int


class OssService:
    """统一封装 OSS 的上传、签名、删除能力。"""

    def __init__(self) -> None:
        if not settings.aliyun_oss_access_key_id or not settings.aliyun_oss_access_key_secret:
            raise ValueError("OSS 凭证未配置")
        if not settings.aliyun_oss_endpoint:
            raise ValueError("OSS endpoint 未配置")

        endpoint = settings.aliyun_oss_endpoint
        if not endpoint.startswith("http"):
            endpoint = f"https://{endpoint}"

        self._auth = oss2.Auth(
            settings.aliyun_oss_access_key_id,
            settings.aliyun_oss_access_key_secret,
        )
        self._endpoint = endpoint

    @staticmethod
    def _detect_content_type(filename: str | None) -> str:
        if not filename:
            return "application/octet-stream"
        guessed, _ = mimetypes.guess_type(filename)
        return guessed or "application/octet-stream"

    @staticmethod
    def _normalize_object_key(file_url_or_key: str) -> str:
        if not file_url_or_key:
            return ""
        if file_url_or_key.startswith("http://") or file_url_or_key.startswith("https://"):
            parsed = urlparse(file_url_or_key)
            key = parsed.path.lstrip("/")
        else:
            # 非 URL：同样进行 unquote，避免传入编码后的 key 无法命中
            key = file_url_or_key.lstrip("/")

        # 签名 URL 可能出现一次或二次编码：%2F / %252F
        # 最多解码两轮，且如果本轮解码后无变化则提前停止。
        for _ in range(2):
            decoded = unquote(key)
            if decoded == key:
                break
            key = decoded
        return key

    @staticmethod
    def _build_avatar_object_key(user_id: uuid.UUID | str, filename: str | None) -> str:
        ext = ""
        if filename:
            _, ext = os.path.splitext(filename)
            ext = ext.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"
        return f"avatars/{user_id}/{uuid.uuid4().hex}{ext}"

    @staticmethod
    def _build_dm_object_key(conversation_id: str, filename: str | None) -> str:
        ext = ""
        if filename:
            _, ext = os.path.splitext(filename)
            ext = ext.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"
        return f"dm/{conversation_id}/{uuid.uuid4().hex}{ext}"

    @staticmethod
    def _build_ai_image_object_key(dream_id: uuid.UUID | str, content_type: str | None) -> str:
        ext_map = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        ext = ext_map.get((content_type or "").lower(), ".png")
        return f"ai-images/{dream_id}/{uuid.uuid4().hex}{ext}"

    @staticmethod
    def _build_attachment_object_key(dream_id: uuid.UUID | str, filename: str, category: str) -> str:
        safe_category = (category or "files").strip().lower()
        ext = os.path.splitext(filename)[1].lower() if filename else ""
        return f"attachments/{dream_id}/{safe_category}/{uuid.uuid4().hex}{ext}"

    def _get_bucket_name(self, bucket_type: BucketType) -> str:
        bucket_name = (
            settings.aliyun_oss_public_bucket
            if bucket_type == "public"
            else settings.aliyun_oss_private_bucket
        )
        if not bucket_name:
            raise ValueError(f"OSS {bucket_type} bucket 未配置")
        return bucket_name

    def _get_bucket(self, bucket_type: BucketType) -> oss2.Bucket:
        return oss2.Bucket(self._auth, self._endpoint, self._get_bucket_name(bucket_type))

    def _bucket_host(self, bucket_type: BucketType) -> str:
        endpoint_host = self._endpoint.replace("https://", "").replace("http://", "")
        return f"{self._get_bucket_name(bucket_type)}.{endpoint_host}"

    async def _put_object_with_retry(
        self,
        *,
        bucket_type: BucketType,
        object_key: str,
        content: bytes,
        content_type: str,
        max_attempts: int = 3,
    ) -> None:
        last_error: Exception | None = None
        bucket = self._get_bucket(bucket_type)

        def _do_upload() -> None:
            bucket.put_object(
                object_key,
                content,
                headers={"Content-Type": content_type},
            )

        for attempt in range(1, max_attempts + 1):
            try:
                await asyncio.to_thread(_do_upload)
                return
            except Exception as exc:
                last_error = exc
                if attempt == max_attempts:
                    raise
                await asyncio.sleep(0.8 * attempt)

        if last_error:
            raise last_error

    async def generate_avatar_upload_signature(
        self,
        *,
        user_id: uuid.UUID | str,
        filename: str,
        content_type: str | None = None,
        expires_seconds: int = 900,
    ) -> dict[str, str | int]:
        object_key = self._build_avatar_object_key(user_id, filename)
        resolved_content_type = content_type or self._detect_content_type(filename)

        def _do_sign() -> tuple[str, str]:
            bucket = self._get_bucket("public")
            upload_url = bucket.sign_url(
                method="PUT",
                key=object_key,
                expires=expires_seconds,
                headers={"Content-Type": resolved_content_type},
            )
            access_url = f"https://{self._bucket_host('public')}/{object_key}"
            return upload_url, access_url

        upload_url, access_url = await asyncio.to_thread(_do_sign)
        return {
            "upload_url": upload_url,
            "access_url": access_url,
            "file_key": object_key,
            "expires_in": expires_seconds,
        }

    async def generate_dm_image_upload_signature(
        self,
        *,
        conversation_id: uuid.UUID | str,
        filename: str,
        content_type: str,
        expires_seconds: int = 900,
    ) -> dict[str, str | int]:
        object_key = self._build_dm_object_key(str(conversation_id), filename)

        def _do_sign() -> tuple[str, str]:
            bucket = self._get_bucket("private")
            upload_url = bucket.sign_url(
                method="PUT",
                key=object_key,
                expires=expires_seconds,
                headers={"Content-Type": content_type},
            )
            return upload_url, object_key

        upload_url, file_key = await asyncio.to_thread(_do_sign)
        return {
            "upload_url": upload_url,
            "file_key": file_key,
            "expires_in": expires_seconds,
        }

    async def upload_public_ai_image(
        self,
        *,
        dream_id: uuid.UUID | str,
        content: bytes,
        content_type: str = "image/png",
    ) -> UploadedObject:
        object_key = self._build_ai_image_object_key(dream_id, content_type)

        await self._put_object_with_retry(
            bucket_type="public",
            object_key=object_key,
            content=content,
            content_type=content_type,
        )
        return UploadedObject(object_key=object_key, content_type=content_type, size=len(content))

    async def get_public_access_url(self, object_key: str) -> str:
        normalized_key = self._normalize_object_key(object_key)
        if not normalized_key:
            raise ValueError("无效的 object key")
        return f"https://{self._bucket_host('public')}/{normalized_key}"

    async def generate_attachment_upload_signature(
        self,
        *,
        dream_id: uuid.UUID | str,
        filename: str,
        content_type: str,
        category: str,
        expires_seconds: int = 900,
    ) -> dict[str, str | int]:
        object_key = self._build_attachment_object_key(dream_id, filename, category)

        def _do_sign() -> tuple[str, str]:
            bucket = self._get_bucket("private")
            upload_url = bucket.sign_url(
                method="PUT",
                key=object_key,
                expires=expires_seconds,
                headers={"Content-Type": content_type},
            )
            # 返回私有对象的可访问地址（签名 GET URL），用于前端立即展示
            access_url = bucket.sign_url("GET", object_key, expires_seconds)
            return upload_url, object_key, access_url

        upload_url, file_key, access_url = await asyncio.to_thread(_do_sign)
        return {
            "upload_url": upload_url,
            "access_url": access_url,
            "file_key": file_key,
            "expires_in": expires_seconds,
        }

    async def sign_private_object_url(self, object_key: str, expires_seconds: int = 3600) -> str:
        normalized_key = self._normalize_object_key(object_key)
        if not normalized_key:
            raise ValueError("无效的 object key")

        def _do_sign() -> str:
            return self._get_bucket("private").sign_url("GET", normalized_key, expires_seconds)

        return await asyncio.to_thread(_do_sign)

    async def delete_object_by_url(self, file_url_or_key: str, bucket_type: BucketType = "public") -> bool:
        object_key = self._normalize_object_key(file_url_or_key)
        if not object_key:
            return False

        def _do_delete() -> bool:
            try:
                self._get_bucket(bucket_type).delete_object(object_key)
                return True
            except Exception:
                return False

        return await asyncio.to_thread(_do_delete)


_oss_service_singleton: OssService | None = None


def get_oss_service() -> OssService:
    global _oss_service_singleton
    if _oss_service_singleton is None:
        _oss_service_singleton = OssService()
    return _oss_service_singleton

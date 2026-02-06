"""
阿里云 OSS 上传服务
"""

import os
import re
import time
import uuid
from typing import Any, Literal

try:
    import oss2
    from aliyunsdkcore import client
    from aliyunsdksts.request.v20150401 import AssumeRoleRequest
    OSS_AVAILABLE = True
except ImportError:
    OSS_AVAILABLE = False

from app.core.config import settings


class OSSService:
    """阿里云 OSS 服务类"""

    def __init__(self, user_id: str | uuid.UUID, bucket_type: Literal["public", "private"] = "public"):
        if not OSS_AVAILABLE:
            raise RuntimeError("OSS SDK 未安装，请运行: uv add oss2 aliyun-python-sdk-core aliyun-python-sdk-sts")
        
        if not user_id:
            raise ValueError("用户ID不能为空")

        # 检查配置
        if not all([
            settings.aliyun_oss_access_key_id,
            settings.aliyun_oss_access_key_secret,
            settings.aliyun_oss_endpoint,
        ]):
            raise RuntimeError("阿里云 OSS 配置不完整，请检查环境变量")

        # 根据类型选择 Bucket
        if bucket_type == "public":
            bucket_name = settings.aliyun_oss_public_bucket
            if not bucket_name:
                raise RuntimeError("公开 Bucket 未配置，请设置 ALIYUN_OSS_PUBLIC_BUCKET")
        else:
            bucket_name = settings.aliyun_oss_private_bucket
            if not bucket_name:
                raise RuntimeError("私密 Bucket 未配置，请设置 ALIYUN_OSS_PRIVATE_BUCKET")

        self.user_id = str(user_id)
        self.bucket_type = bucket_type
        self.access_key_id = settings.aliyun_oss_access_key_id
        self.access_key_secret = settings.aliyun_oss_access_key_secret
        self.role_arn = settings.aliyun_oss_role_arn

        # 处理 endpoint
        self.endpoint = settings.aliyun_oss_endpoint.strip()
        if not self.endpoint.startswith(("http://", "https://")):
            self.endpoint = f"https://{self.endpoint}"

        self.bucket_name = bucket_name
        self.user_prefix = f"users/{self.user_id}/"
        self.auth = oss2.Auth(self.access_key_id, self.access_key_secret)

    def _clear_proxy_env(self) -> dict[str, str]:
        """清除代理环境变量（避免影响 OSS 请求）"""
        original_proxies = {}
        for proxy_var in ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"]:
            if proxy_var in os.environ:
                original_proxies[proxy_var] = os.environ[proxy_var]
                del os.environ[proxy_var]
        return original_proxies

    def _restore_proxy_env(self, original_proxies: dict[str, str]) -> None:
        """恢复代理环境变量"""
        for proxy_var, proxy_value in original_proxies.items():
            os.environ[proxy_var] = proxy_value

    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名，确保安全"""
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
        safe_name = safe_name[:50]
        return f"{safe_name}.{ext}" if ext else safe_name

    def get_avatar_upload_path(self, filename: str = "") -> str:
        """获取头像上传路径"""
        if filename:
            safe_filename = self._sanitize_filename(filename)
            unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
        else:
            unique_filename = f"{uuid.uuid4().hex}.jpg"

        return f"{self.user_prefix}avatars/{unique_filename}"

    def generate_presigned_url(
        self,
        filename: str,
        content_type: str = "image/jpeg",
        expires: int = 3600,
    ) -> dict[str, Any]:
        """生成预签名上传 URL"""
        original_proxies = self._clear_proxy_env()

        try:
            file_key = self.get_avatar_upload_path(filename)
            bucket = oss2.Bucket(self.auth, self.endpoint, self.bucket_name)

            # 生成上传 URL
            upload_url = bucket.sign_url(
                "PUT",
                file_key,
                expires,
                headers={"Content-Type": content_type},
            )

            # 生成访问 URL（稳定URL，不含签名）
            access_url = self.get_stable_url(file_key)

            return {
                "upload_url": upload_url,
                "access_url": access_url,
                "file_key": file_key,
                "expires_in": expires,
            }
        finally:
            self._restore_proxy_env(original_proxies)

    def get_stable_url(self, file_key: str) -> str:
        """
        构造稳定的对象 URL
        
        - 公开 Bucket：返回不带签名的公开 URL
        - 私密 Bucket：返回带签名的 URL（有效期 1 年）
        """
        endpoint_host = self.endpoint.replace("https://", "").replace("http://", "").rstrip("/")
        
        if self.bucket_type == "public":
            # 公开 Bucket，返回简洁的公开 URL
            return f"https://{self.bucket_name}.{endpoint_host}/{file_key}"
        else:
            # 私密 Bucket，返回带签名的 URL
            try:
                bucket = oss2.Bucket(self.auth, self.endpoint, self.bucket_name)
                # 签名有效期 1 年
                signed_url = bucket.sign_url("GET", file_key, 31536000)
                return signed_url
            except Exception:
                # 降级：返回公开 URL（可能无法访问）
                return f"https://{self.bucket_name}.{endpoint_host}/{file_key}"

    def delete_file(self, file_key: str) -> bool:
        """删除文件"""
        try:
            # 安全检查：只能删除自己的文件
            if not file_key.startswith(self.user_prefix):
                return False

            original_proxies = self._clear_proxy_env()

            try:
                bucket = oss2.Bucket(self.auth, self.endpoint, self.bucket_name)
                bucket.delete_object(file_key)
                return True
            finally:
                self._restore_proxy_env(original_proxies)

        except Exception:
            return False
    
    @staticmethod
    def extract_file_key_from_url(url: str, user_id: str | uuid.UUID) -> str | None:
        """
        从OSS URL中提取file_key
        
        支持的URL格式:
        - https://bucket.endpoint.aliyuncs.com/users/{user_id}/avatars/xxx.jpg
        - https://bucket.endpoint.aliyuncs.com/users/{user_id}/avatars/xxx.jpg?signature=...
        
        Args:
            url: OSS文件URL
            user_id: 用户ID
            
        Returns:
            file_key或None
        """
        if not url or "aliyuncs.com" not in url:
            return None
        
        try:
            # 移除查询参数
            url_without_params = url.split("?")[0]
            
            # 提取路径部分 (从第一个/users/开始)
            if "/users/" not in url_without_params:
                return None
            
            # 找到 /users/ 的位置并提取后面的部分
            users_index = url_without_params.index("/users/")
            file_key = url_without_params[users_index + 1:]  # +1 跳过开头的 /
            
            # 验证file_key是否属于该用户
            user_prefix = f"users/{str(user_id)}/"
            if file_key.startswith(user_prefix):
                return file_key
            
            return None
        except Exception:
            return None


def get_oss_service(user_id: str | uuid.UUID, bucket_type: Literal["public", "private"] = "public") -> OSSService:
    """
    获取 OSS 服务实例
    
    Args:
        user_id: 用户 ID
        bucket_type: Bucket 类型
            - "public": 公开 Bucket（头像、公开图片等）
            - "private": 私密 Bucket（用户文档、私密文件等）
    """
    return OSSService(user_id, bucket_type)


def delete_oss_file_from_url(url: str | None, user_id: str | uuid.UUID) -> bool:
    """
    从URL删除OSS文件的便捷函数
    
    Args:
        url: OSS文件URL
        user_id: 用户ID
        
    Returns:
        是否删除成功
    """
    if not url:
        return False
    
    try:
        file_key = OSSService.extract_file_key_from_url(url, user_id)
        if file_key:
            oss_service = get_oss_service(user_id)
            return oss_service.delete_file(file_key)
        return False
    except Exception:
        return False

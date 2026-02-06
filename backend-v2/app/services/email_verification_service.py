"""
邮箱验证码服务 - 处理验证码生成、存储和验证
"""

import hashlib
import random
import string

from arq.connections import ArqRedis
from redis.asyncio import Redis


class EmailVerificationService:
    """邮箱验证码服务类"""

    def __init__(self, redis: Redis, arq_redis: ArqRedis):
        self.redis = redis
        self.arq_redis = arq_redis
        self.code_prefix = "email_code:"
        self.rate_limit_prefix = "email_rate:"

    @staticmethod
    def generate_code(length: int = 6) -> str:
        """生成6位数字验证码"""
        return "".join(random.choices(string.digits, k=length))

    @staticmethod
    def hash_code(code: str) -> str:
        """哈希验证码"""
        return hashlib.sha256(code.encode()).hexdigest()

    async def store_code(self, email: str, code: str, expires: int = 300) -> bool:
        """
        存储验证码到 Redis (5分钟过期)

        Args:
            email: 邮箱地址
            code: 验证码
            expires: 过期时间（秒），默认 300 秒（5分钟）

        Returns:
            bool: 是否存储成功
        """
        key = f"{self.code_prefix}{email}"
        hashed = self.hash_code(code)
        return await self.redis.setex(key, expires, hashed)

    async def verify_code(self, email: str, code: str) -> bool:
        """
        验证验证码

        Args:
            email: 邮箱地址
            code: 验证码

        Returns:
            bool: 验证是否成功
        """
        key = f"{self.code_prefix}{email}"
        stored_hash = await self.redis.get(key)

        if not stored_hash:
            return False

        code_hash = self.hash_code(code)
        if code_hash == stored_hash:
            await self.redis.delete(key)  # 验证成功后删除
            return True
        return False

    async def check_rate_limit(self, email: str, limit: int = 60) -> tuple[bool, int]:
        """
        检查发送频率限制

        Args:
            email: 邮箱地址
            limit: 限制时间（秒），默认 60 秒

        Returns:
            tuple: (是否允许发送, 剩余等待时间)
        """
        key = f"{self.rate_limit_prefix}{email}"
        ttl = await self.redis.ttl(key)

        if ttl > 0:
            return False, ttl

        await self.redis.setex(key, limit, "1")
        return True, 0

    async def send_code(self, email: str, purpose: str) -> bool:
        """
        生成验证码并提交到 Arq 队列异步发送

        Args:
            email: 邮箱地址
            purpose: 场景 (signup/login/reset)

        Returns:
            bool: 是否提交成功
        """
        code = self.generate_code()
        await self.store_code(email, code)

        # 提交任务到 Arq 队列
        await self.arq_redis.enqueue_job(
            "send_verification_email", email=email, code=code, purpose=purpose
        )
        return True

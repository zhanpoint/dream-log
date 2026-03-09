"""
Redis 连接管理
"""

import logging

from arq import create_pool
from arq.connections import ArqRedis
from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis 客户端 (用于缓存)
redis_client: Redis | None = None

# Arq Redis 连接池 (用于任务队列)
arq_redis: ArqRedis | None = None


async def init_redis() -> None:
    """初始化 Redis 连接"""
    global redis_client, arq_redis
    try:
        redis_client = Redis.from_url(
            str(settings.redis_url),
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=10,
            socket_keepalive=True,
            health_check_interval=30,
        )
        await redis_client.ping()
        from app.core.arq_app import get_arq_redis_settings

        arq_redis = await create_pool(get_arq_redis_settings())
        await arq_redis.ping()
    except Exception as e:
        logger.error(f"❌ Redis 连接失败: {e}")
        if redis_client:
            await redis_client.close()
            redis_client = None
        if arq_redis:
            await arq_redis.close()
            arq_redis = None
        raise


async def close_redis() -> None:
    """关闭 Redis 连接"""
    global redis_client, arq_redis

    if redis_client:
        await redis_client.close()

    if arq_redis:
        await arq_redis.close()


def get_redis() -> Redis:
    """获取 Redis 客户端"""
    if not redis_client:
        raise RuntimeError("Redis not initialized")
    return redis_client


def get_arq_redis() -> ArqRedis:
    """获取 Arq Redis 连接"""
    if not arq_redis:
        raise RuntimeError("Arq Redis not initialized")
    return arq_redis

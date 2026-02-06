"""
Arq 任务队列配置
"""

import logging

from arq.connections import RedisSettings

from app.core.config import settings


def get_arq_redis_settings() -> RedisSettings:
    """获取 Arq Redis 配置"""
    redis_url = settings.redis_url
    host = redis_url.host or "localhost"
    database = int(redis_url.path.lstrip("/")) if redis_url.path and redis_url.path != "/" else 0
    return RedisSettings(
        host=host,
        port=redis_url.port or 6379,
        password=redis_url.password,
        database=database,
    )


async def startup(ctx: dict) -> None:
    """Worker 启动时执行"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    redis_settings = get_arq_redis_settings()
    print(f"🚀 Arq Worker 启动 | Redis: {redis_settings.host}:{redis_settings.port}")


async def shutdown(ctx: dict) -> None:
    """Worker 关闭时执行"""
    print("👋 Arq Worker 关闭")


class WorkerSettings:
    """Arq Worker 配置"""

    # 延迟导入任务函数，避免循环导入
    from app.tasks.dream_analysis_tasks import analyze_dream
    from app.tasks.email_tasks import send_verification_email

    # 任务函数列表
    functions = [
        send_verification_email,
        analyze_dream,
    ]

    # Redis 配置
    redis_settings = get_arq_redis_settings()

    # Worker 配置
    max_jobs = 10
    job_timeout = 300  # 5 分钟 (AI 分析可能较慢)
    keep_result = 3600
    max_tries = 3

    # 生命周期钩子
    on_startup = startup
    on_shutdown = shutdown

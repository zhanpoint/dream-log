"""
Arq 任务队列配置
"""

import logging

from arq.connections import RedisSettings
from redis.asyncio import Redis

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
    # 用于向 API 进程推送 SSE 事件（分析状态等）
    ctx["redis_pub"] = Redis.from_url(
        str(settings.redis_url),
        encoding="utf-8",
        decode_responses=True,
    )
    # 用于任务取消标记
    ctx["redis"] = Redis.from_url(
        str(settings.redis_url),
        encoding="utf-8",
        decode_responses=True,
    )


async def shutdown(ctx: dict) -> None:
    """Worker 关闭时执行"""
    redis_pub = ctx.get("redis_pub")
    if redis_pub:
        await redis_pub.close()
    redis_client = ctx.get("redis")
    if redis_client:
        await redis_client.close()
    print("👋 Arq Worker 关闭")


class WorkerSettings:
    """Arq Worker 配置"""

    # 延迟导入任务函数，避免循环导入
    from arq import cron

    from app.config.insight_config import InsightConfig
    from app.tasks.dream_analysis_tasks import analyze_dream
    from app.tasks.email_tasks import send_verification_email
    from app.tasks.embedding_update_tasks import update_pending_embeddings
    from app.tasks.insight_tasks import (
        generate_annual_reports,
        generate_monthly_reports,
        generate_weekly_reports,
    )

    # 任务函数列表
    functions = [
        send_verification_email,
        analyze_dream,
        generate_monthly_reports,
        generate_weekly_reports,
        generate_annual_reports,
        update_pending_embeddings,
    ]

    # 定时任务
    cron_jobs = [
        cron(
            generate_monthly_reports,
            month={1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12},
            day=1,
            hour=InsightConfig.MONTHLY_REPORT_CRON_HOUR,
            minute=0,
            unique=True,
        ),
        # 每周一生成周报（weekday=0 表示周一）
        cron(
            generate_weekly_reports,
            weekday=0,
            hour=InsightConfig.WEEKLY_REPORT_CRON_HOUR,
            minute=0,
            unique=True,
        ),
        # 每年1月1日生成年度回顾
        cron(
            generate_annual_reports,
            month=1,
            day=1,
            hour=InsightConfig.ANNUAL_REPORT_CRON_HOUR,
            minute=0,
            unique=True,
        ),
        # 每 5 分钟检查并更新标记的 embedding
        cron(
            update_pending_embeddings,
            minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
            unique=True,
        ),
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

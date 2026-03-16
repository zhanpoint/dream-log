"""
FastAPI 应用主入口
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.featured import FEATURED_CONFIG
from app.core.config import settings
from app.core.redis import close_redis, get_redis, init_redis
from app.core.sse_manager import run_redis_sse_subscriber
from app.tasks.featured_tasks import featured_recalc_daily_loop, featured_recalc_hourly_loop

logger = logging.getLogger(__name__)

# 客户端主动断开连接时 Windows 上 asyncio 可能抛出的异常，视为正常断开，不刷 traceback
# WinError 10054 = ConnectionResetError
_CLIENT_DISCONNECT_EXCEPTIONS = (
    ConnectionResetError,
    BrokenPipeError,
    ConnectionAbortedError,
)


def _asyncio_exception_handler(loop: asyncio.AbstractEventLoop, context: dict) -> None:
    """自定义 asyncio 异常处理器：客户端断开导致的错误仅打 DEBUG，避免刷屏"""
    exc = context.get("exception")
    if exc is not None and isinstance(exc, _CLIENT_DISCONNECT_EXCEPTIONS):
        msg = context.get("message", "")
        logger.debug("客户端断开连接: %s - %s", type(exc).__name__, msg)
        return
    # 其他异常交给默认处理器
    loop.default_exception_handler(context)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """应用生命周期管理"""
    # 启动时执行
    loop = asyncio.get_running_loop()
    loop.set_exception_handler(_asyncio_exception_handler)

    print(f" 环境: {settings.app_env}")

    # 初始化 Redis 连接
    await init_redis()
    print("✅ Redis 连接已建立")

    # 启动 SSE Redis 订阅（接收 Worker 发布的分析状态，推送给前端）
    sse_subscriber_task = asyncio.create_task(run_redis_sse_subscriber(get_redis))

    featured_hourly_task = None
    featured_daily_task = None
    if FEATURED_CONFIG.recalc_hourly_enabled:
        featured_hourly_task = asyncio.create_task(featured_recalc_hourly_loop())
    if FEATURED_CONFIG.recalc_daily_enabled:
        featured_daily_task = asyncio.create_task(featured_recalc_daily_loop())

    yield

    # 关闭时执行
    for task in (featured_hourly_task, featured_daily_task, sse_subscriber_task):
        if task:
            task.cancel()
    for task in (featured_hourly_task, featured_daily_task, sse_subscriber_task):
        if task:
            try:
                await task
            except asyncio.CancelledError:
                pass
    await close_redis()
    print("✅ Redis 连接已关闭")
    print(f"👋 {settings.app_name} 关闭中...")


app = FastAPI(
    title=settings.app_name,
    description="梦境日志系统 API (FastAPI 版本)",
    version="2.0.0",
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """根路由"""
    return {
        "message": f"欢迎使用 {settings.app_name}",
        "version": "2.0.0",
        "environment": settings.app_env,
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """健康检查"""
    return {"status": "healthy"}


# 注册路由
from app.api import (
    auth,
    billing,
    community,
    quota,
    dm,
    dreams,
    exploration,
    insights,
    notifications,
    oauth,
    user,
    voice_ws,
)

app.include_router(auth.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(quota.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(dreams.router, prefix="/api")
app.include_router(dreams.tag_router, prefix="/api")
app.include_router(voice_ws.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(exploration.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(dm.router, prefix="/api")
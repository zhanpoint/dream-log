"""
FastAPI 应用主入口
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import close_redis, init_redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """应用生命周期管理"""
    # 启动时执行
    print(f" 环境: {settings.app_env}")

    # 初始化 Redis 连接
    await init_redis()
    print("✅ Redis 连接已建立")

    yield

    # 关闭时执行
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
from app.api import auth, dreams, oauth, user

app.include_router(auth.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(dreams.router, prefix="/api")
app.include_router(dreams.tag_router, prefix="/api")
# syntax=docker/dockerfile:1

# ---- Builder Stage ----
FROM python:3.9-slim as builder

# 安装系统依赖和构建工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libmariadb-dev \
    pkg-config \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 优化依赖安装，充分利用Docker缓存
COPY requirements_deploy.txt .

# 创建虚拟环境并安装依赖
RUN python -m venv /opt/venv
# BuildKit 功能，挂载一个持久缓存目录 /root/.cache/pip，pip 会缓存已下载的包，下一次构建镜像时可以复用，不用重新下载，加快构建速度。
RUN --mount=type=cache,target=/root/.cache/pip \
    /opt/venv/bin/pip install --no-cache-dir \
    -r requirements_deploy.txt

# ---- Production Stage ----
FROM python:3.9-slim AS production

# 创建应用用户
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# 安装运行时依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dos2unix \
    libmariadb3 \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # 使用虚拟环境的 Python 和工具
    PATH=/opt/venv/bin:$PATH \
    # 设置项目根目录到 Python 路径，虚拟环境自动处理第三方库
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# 从构建器阶段拷贝虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 创建必要的目录
RUN mkdir -p /app/scripts /app/logs /app/media /app/staticfiles_collected && \
    chown -R appuser:appuser /app

# 拷贝启动脚本并设置权限
COPY --chown=appuser:appuser ./scripts/start.sh /app/scripts/start.sh

# 拷贝应用代码
COPY --chown=appuser:appuser ./apps /app/apps
COPY --chown=appuser:appuser ./config /app/config
COPY --chown=appuser:appuser ./manage.py /app/manage.py

# 修复脚本行尾符并设置权限
RUN dos2unix /app/scripts/start.sh && \
    chmod +x /app/scripts/start.sh

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python manage.py check --deploy || exit 1

# 启动命令
CMD ["/app/scripts/start.sh"] 
# syntax=docker/dockerfile:1

# ---- Builder Stage ----
FROM python:3.9-slim as builder

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 单次RUN安装系统依赖和Python依赖，减少层数
COPY requirements_deploy.txt .
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/root/.cache/pip \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libmariadb-dev \
        libpq-dev \
        pkg-config && \
    python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements_deploy.txt && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ---- Production Stage ----
FROM python:3.9-slim AS production

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/opt/venv/bin:$PATH \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# 一次性安装运行时依赖、创建用户和目录，减少层数
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        dos2unix \
        libmariadb3 \
        libpq5 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && \
    useradd --no-log-init -r -g appuser appuser && \
    mkdir -p /app/scripts /app/logs /app/media /app/staticfiles_collected && \
    chown -R appuser:appuser /app

# 从构建器阶段拷贝虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 拷贝应用代码和脚本
COPY --chown=appuser:appuser ./scripts/start.sh /app/scripts/start.sh
COPY --chown=appuser:appuser ./apps /app/apps
COPY --chown=appuser:appuser ./config /app/config
COPY --chown=appuser:appuser ./manage.py /app/manage.py

# 修复脚本权限（移除collectstatic，在运行时执行）
RUN dos2unix /app/scripts/start.sh && chmod +x /app/scripts/start.sh

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python manage.py check --deploy || exit 1

# 启动命令
CMD ["/app/scripts/start.sh"] 
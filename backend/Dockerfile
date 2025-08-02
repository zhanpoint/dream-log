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

# 使用缓存挂载安装依赖
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --target=/install \
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
    PATH=/install/bin:$PATH \
    PYTHONPATH=/app:/install \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# 从构建器阶段拷贝已安装的依赖
COPY --from=builder /install /install

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
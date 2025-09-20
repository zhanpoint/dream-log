# 基础镜像
FROM python:3.13-slim AS builder

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libmariadb-dev \
    libpq-dev \
    pkg-config \
    curl \
    ca-certificates \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量(将 /root/.local/bin 添加到 PATH，方便使用 uv)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY pyproject.toml uv.lock .

# 安装 uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# 使用 uv sync 进行可重复构建，只安装运行时依赖
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


# ---- Production Stage ----
FROM python:3.13-slim AS production

# 创建非特权用户 appuser，遵循安全最佳实践
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# 安装运行时必需的库，不包含开发工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dos2unix \
    libmariadb3 \
    libpq5 \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# 从构建器阶段拷贝虚拟环境
COPY --from=builder /app/.venv /app/.venv

# 拷贝应用代码
COPY --chown=appuser:appuser ./apps ./config ./manage.py /app/
# 单独拷贝启动脚本并赋予可执行权限
COPY --chown=appuser:appuser --chmod=0755 ./scripts/start.sh /app/scripts/start.sh

# 处理启动脚本
RUN dos2unix /app/scripts/start.sh

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["/app/scripts/start.sh"] 
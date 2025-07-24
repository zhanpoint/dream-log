# syntax=docker/dockerfile:1

# ---- Builder Stage ----
# 在这个阶段，我们安装所有依赖，包括那些需要编译的包。
FROM python:3.9-slim as builder

# --- 安装系统依赖 ---
# 为 mysqlclient 和其他可能需要编译的库安装构建工具和开发头文件
# libmariadb-dev 是 mysqlclient 的关键依赖
# pkg-config 是编译 mysqlclient 所需的工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libmariadb-dev \
    pkg-config \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# --- 优化依赖安装，充分利用Docker缓存 ---
WORKDIR /app

# 1. 首先只复制依赖文件。
# 只要这个文件没变，下面的依赖安装步骤就可以使用缓存。
COPY requirements_deploy.txt .

# 2. 安装依赖，并使用缓存挂载。
# --mount=type=cache,target=/root/.cache/pip 会将 pip 的缓存目录挂载进来，
# 即使 requirements.txt 变化，也无需重新下载所有包，极大提升构建速度。
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --target=/install -r requirements_deploy.txt


# ---- Final Stage ----
# 在这个阶段，我们只从构建器中拷贝必要的产物。
FROM python:3.9-slim AS final

# Best practice: Use key=value format for ENV
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies.
# dos2unix 用于修复脚本换行符问题。
# libmariadb3 是 mysqlclient 在运行时必需的共享库。
RUN apt-get update && \
    apt-get install -y --no-install-recommends dos2unix libmariadb3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 从构建器阶段拷贝已安装的依赖
COPY --from=builder /install /install

# 分步复制项目文件，以获得更好的明确性和缓存效果
# 1. 首先创建必要的目录结构 (包括日志目录)
RUN mkdir -p /app/scripts /app/logs

# 2. 复制启动脚本 (确保它总是被复制，不受.dockerignore影响)
COPY ./scripts/start.sh /app/scripts/start.sh

# 3. 复制应用代码和项目管理文件
COPY ./apps /app/apps
COPY ./config /app/config
COPY ./manage.py /app/manage.py

# Fix line endings and set permissions in a single RUN instruction
# Convert start.sh from DOS/Windows format (CRLF) to Unix format (LF)
# This is crucial for cross-platform compatibility.
RUN dos2unix /app/scripts/start.sh && \
    chmod +x /app/scripts/start.sh

# Set environment variables for runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/install/bin:$PATH \
    PYTHONPATH=/app:/install \
    DJANGO_SETTINGS_MODULE=config.settings.prod

# Expose the port daphne will run on
EXPOSE 8000

# The command to run when the container starts.
# This should be the last instruction in the Dockerfile.
CMD ["/app/scripts/start.sh"] 
# ---- Builder Stage ----
# 在这个阶段，我们安装所有依赖，包括那些需要编译的包。
FROM python:3.9-slim as builder

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 安装并固定构建工具的版本，确保构建环境的一致性
RUN pip install --no-cache-dir --upgrade pip==24.0 setuptools==69.5.1 wheel==0.43.0

# 将依赖需求文件复制到构建器中
COPY requirements_deploy.txt /app/
WORKDIR /app

# 安装所有依赖到一个特定的目录 /install 中
# 使用 requirements_deploy.txt 确保版本固定，提高可重现性
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --target=/install -r requirements_deploy.txt


# ---- Final Stage ----
# 在这个阶段，我们只从构建器中拷贝必要的产物。
FROM python:3.9-slim AS final

# Best practice: Use key=value format for ENV
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies.
# dos2unix is needed to fix Windows/Unix line ending issues.
# We don't pin the version here to ensure compatibility with the base image's repository.
RUN apt-get update && \
    apt-get install -y --no-install-recommends dos2unix && \
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
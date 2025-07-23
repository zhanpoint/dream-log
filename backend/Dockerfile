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
FROM python:3.9-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PATH="/install/bin:${PATH}"
ENV PYTHONPATH="/install"

# 设置工作目录
WORKDIR /app

# 从构建器阶段拷贝已安装的依赖
COPY --from=builder /install /install

# 分步复制项目文件，以获得更好的明确性和缓存效果
# 1. 复制整个scripts目录 (更可靠的方法)
COPY ./scripts /app/scripts

# 2. 复制应用代码和项目管理文件
COPY ./apps /app/apps
COPY ./config /app/config
COPY ./manage.py /app/manage.py

# 赋予启动脚本执行权限并确保使用Unix换行符
# 将连续的RUN指令合并以减少镜像层数并提高构建效率
RUN chmod +x /app/scripts/start.sh && \
    sed -i 's/\r$//g' /app/scripts/start.sh 
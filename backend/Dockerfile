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
ENV PATH="/install/bin:${PATH}" # 将安装目录的bin加入PATH

# 设置工作目录
WORKDIR /app

# 从构建器阶段拷贝已安装的依赖
COPY --from=builder /install /install

# 复制项目所有文件到工作目录
# 由于 .dockerignore 的存在，这不会拷贝不必要的文件
COPY . . 
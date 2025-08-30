# syntax=docker/dockerfile:1

# --- 第一阶段：构建React应用 ---
# 【修复】升级到 Node.js 20 解决 React Router 7.8.2 引擎兼容性问题
FROM node:20-alpine AS build

# 设置工作目录
WORKDIR /app

# 定义构建参数，用于控制是否强制重新安装依赖
ARG FORCE_REINSTALL_DEPS=false

# 拷贝包管理文件（构建上下文改为仓库根目录时使用 frontend/ 前缀）
COPY frontend/package*.json ./

# 【修复】智能依赖安装 - 根据参数决定是否强制重新安装
RUN if [ "$FORCE_REINSTALL_DEPS" = "true" ]; then \
        echo "强制重新安装模式：清理所有缓存和依赖..."; \
        rm -rf node_modules package-lock.json || true; \
        npm cache clean --force; \
        echo "重新安装所有依赖..."; \
        npm install --legacy-peer-deps; \
    else \
        echo "正常缓存安装模式..."; \
        npm ci --legacy-peer-deps; \
    fi && \
    echo "验证 React 版本..." && \
    npm list react react-dom --depth=0

# 拷贝源代码
COPY frontend/ .

# 【智能构建】根据参数决定是否需要强制清理缓存
RUN if [ "$FORCE_REINSTALL_DEPS" = "true" ]; then \
        echo "强制清理模式：清理 Vite 缓存..."; \
        rm -rf node_modules/.vite node_modules/.cache dist || true; \
        echo "开始清理构建..."; \
        npm run build; \
    else \
        echo "正常缓存构建..."; \
        npm run build; \
    fi

# --- 第二阶段：生产环境 ---
FROM nginx:1.25-alpine AS production

# 为 Nginx 创建并授权所有必要的缓存和临时目录，从根源上解决权限问题
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx

# 从构建阶段拷贝静态文件
COPY --from=build /app/dist /usr/share/nginx/html

# 为静态文件设置正确的属主（使用镜像内置的 nginx 用户）
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 覆盖容器内 Nginx 配置为仓库自带的生产配置
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查：命中 Nginx 的本地健康检查端点，避免 301 跳转与证书校验
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/healthz || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"] 
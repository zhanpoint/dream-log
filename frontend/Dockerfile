# syntax=docker/dockerfile:1

# --- 第一阶段：构建React应用 ---
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 定义构建参数，用于控制是否强制重新安装依赖
ARG FORCE_REINSTALL_DEPS=false

# 拷贝包管理文件
COPY package*.json ./

# 安装依赖，使用缓存挂载加速构建
# 在需要强制重新安装时，先清除缓存
RUN --mount=type=cache,target=/root/.npm \
    if [ "$FORCE_REINSTALL_DEPS" = "true" ]; then \
        echo "FORCE_REINSTALL_DEPS is true, clearing npm cache..."; \
        rm -rf /root/.npm/*; \
    fi && \
    npm ci --legacy-peer-deps

# 拷贝源代码
COPY . .

# 构建应用
RUN npm run build

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

# 暴露端口
EXPOSE 80

# 健康检查：命中 Nginx 的本地健康检查端点，避免 301 跳转与证书校验
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/healthz || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"] 
# syntax=docker/dockerfile:1

# --- 第一阶段：构建React应用 ---
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 拷贝包管理文件，优先利用 Docker 层缓存
COPY package*.json ./

# 安装依赖，使用缓存挂载加速构建
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --legacy-peer-deps

# 拷贝源代码
COPY . .

# 构建应用
RUN npm run build

# --- 第二阶段：生产环境 ---
FROM nginx:1.25-alpine AS production

# 创建 nginx 用户和必要目录
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# 从构建阶段拷贝静态文件
COPY --from=build /app/dist /usr/share/nginx/html

# 设置适当的权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 使用非 root 用户运行
USER nginx

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"] 
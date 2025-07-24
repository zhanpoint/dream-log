# syntax=docker/dockerfile:1

# --- 第一阶段：构建React应用 ---
# 使用官方Node.js 18作为基础镜像
FROM node:18 AS build

# 设置工作目录
WORKDIR /app

# 拷贝 package.json 和 package-lock.json
COPY package.json ./
# 如果您使用 lock 文件，请取消下面的注释
# COPY package-lock.json ./

# 安装依赖，并使用缓存挂载来加速
# --mount=type=cache,target=/root/.npm 会持久化npm的缓存目录
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps

# 拷贝所有前端代码并构建
COPY . .
RUN npm run build

# --- 第二阶段：配置Nginx ---
# 使用轻量级的Nginx镜像
FROM nginx:1.21-alpine

# 从构建阶段拷贝编译好的静态文件到Nginx的web根目录
COPY --from=build /app/dist /usr/share/nginx/html

# 注意：Nginx的配置文件将通过 docker-compose.yml 挂载
# 这里我们不再将 nginx.conf 拷贝进镜像，以实现配置与镜像的分离

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"] 
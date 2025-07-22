# --- 第一阶段：构建React应用 ---
# 使用官方Node.js 18作为基础镜像
FROM node:18 AS build

# 设置工作目录
WORKDIR /app

# 拷贝 package.json 和 package-lock.json (或 yarn.lock)
# 这样可以利用Docker的层缓存，只有在依赖更新时才重新安装
COPY package.json ./
# 注意：如果 package-lock.json 引发问题，可以暂时注释掉
# COPY package-lock.json ./

# 安装依赖
RUN npm install --legacy-peer-deps

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
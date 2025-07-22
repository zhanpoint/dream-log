# --- 第一阶段：构建React应用 ---
FROM node:18 AS build

WORKDIR /app

# 拷贝 package.json 和 package-lock.json (或 yarn.lock)
# 这样可以利用Docker的层缓存，只有在依赖更新时才重新安装
COPY frontend/package.json ./
# 您的 package-lock.json 可能已过时，导致依赖冲突。
# 我们暂时不复制它，让 npm 根据 package.json 重新生成依赖树。
# COPY frontend/package-lock.json ./
RUN npm install --legacy-peer-deps

# 拷贝所有前端代码并构建
COPY frontend/ ./
RUN npm run build

# --- 第二阶段：配置Nginx ---
FROM nginx:1.21-alpine

# 从构建阶段拷贝编译好的静态文件到Nginx的web根目录
# 修正：Vite的默认输出目录是 'dist'，而不是 'build'
COPY --from=build /app/dist /usr/share/nginx/html

# 拷贝自定义的Nginx配置文件
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露80端口
EXPOSE 80 
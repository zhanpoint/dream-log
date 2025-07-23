#!/bin/sh

# 遇到任何错误则终止脚本
set -e

# --- 数据库和应用初始化 ---
echo "Running database migrations..."
python manage.py migrate

echo "Running custom management commands..."
# 在这里按顺序添加所有需要一次性执行的自定义命令
# get_or_create 保证了这些命令是幂等的，重复执行是安全的
python manage.py create_categories
# 如果有其他命令，像这样继续添加:
# python manage.py another_custom_command

# --- 静态文件处理 ---
echo "Collecting static files..."
python manage.py collectstatic --no-input

# --- 启动主应用 ---
# 使用 exec, 它会用 daphne 进程替换当前的 shell 进程
# 这确保了 daphne 能正确接收和处理来自 Docker 的信号 (如 SIGTERM)
echo "Starting Daphne server..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application 
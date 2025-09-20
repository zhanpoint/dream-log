#!/bin/sh

# 遇到任何错误则终止脚本
set -e

# 确保工作目录与 Python 搜索路径正确
cd /app
export PYTHONPATH=/app:${PYTHONPATH}
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-config.settings.prod}

# --- 数据库就绪检查 ---
python manage.py wait_for_db --timeout=5

# --- 数据库和应用初始化 ---
python manage.py migrate --noinput

# --- 自动执行所有标记为安全的初始化命令 ---
python manage.py auto_deploy_setup

# --- 启动主应用 ---
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application 
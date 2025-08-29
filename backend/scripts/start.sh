#!/bin/sh

# 遇到任何错误则终止脚本
set -e

# --- 最佳实践：等待数据库服务完全就绪 ---
python -c "
import sys
import time
from django.db import connections
from django.db.utils import OperationalError

db_conn = None
# 循环尝试连接，直到成功
while not db_conn:
    try:
        # 使用Django默认的数据库连接配置
        connections['default'].cursor()
        db_conn = True
    except OperationalError:
        print('Database unavailable, waiting 1 second...')
        time.sleep(1)
"

# --- 数据库和应用初始化 ---
python manage.py migrate

# --- 自动执行所有标记为安全的初始化命令 ---
python manage.py auto_deploy_setup

# --- 静态文件处理 ---
# python manage.py collectstatic --no-input

# --- 启动主应用 ---
# 使用 exec, 它会用 daphne 进程替换当前的 shell 进程
# 这确保了 daphne 能正确接收和处理来自 Docker 的信号 (如 SIGTERM)
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application 
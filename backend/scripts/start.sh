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

# 在这里按顺序添加所有需要一次性执行的自定义命令
# get_or_create 保证了这些命令是幂等的，重复执行是安全的
python manage.py create_categories
# 从 Celery 配置中强制初始化或更新数据库中的定时任务
python manage.py setup_periodic_tasks --overwrite

# 如果有其他命令，像这样继续添加:
# python manage.py another_custom_command

# --- 静态文件处理 ---
# python manage.py collectstatic --no-input

# --- 启动主应用 ---
# 使用 exec, 它会用 daphne 进程替换当前的 shell 进程
# 这确保了 daphne 能正确接收和处理来自 Docker 的信号 (如 SIGTERM)
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application 
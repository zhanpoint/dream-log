#!/usr/bin/env python
"""
Django 管理入口。
"""
import os
import sys
from pathlib import Path


def main() -> None:
    """
    运行管理命令。
    """
    # 设置环境变量
    app_env = os.environ.get('APP_ENV', 'dev')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'config.settings.{app_env}')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "无法导入Django。请确保Django已安装且虚拟环境已激活。"
        ) from exc
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

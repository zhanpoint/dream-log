"""
现代化环境变量加载器
统一的环境变量管理，遵循 12-Factor App 原则
"""
import os
from pathlib import Path
from typing import Any, Dict, Optional
import environ

# 初始化 django-environ
env = environ.Env(
    # 布尔类型配置
    DEBUG=(bool, False),
    EMAIL_USE_SSL=(bool, True),
    EMAIL_USE_TLS=(bool, False),
    SMS_SERVICE_ENABLED=(bool, False),
    EMAIL_SERVICE_ENABLED=(bool, True),
    RAG_ENABLED=(bool, True),
    
    # 整数类型配置
    DB_PORT=(int, 3306),
    REDIS_PORT=(int, 6379),
    REDIS_DB=(int, 0),
    RABBITMQ_PORT=(int, 5672),
    LANGGRAPH_DB_PORT=(int, 5432),
    EMAIL_PORT=(int, 465),
    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=(int, 1440),  # 24小时
    JWT_REFRESH_TOKEN_LIFETIME_DAYS=(int, 30),      # 30天
    
    # 列表类型配置
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
)

def load_environment_variables() -> None:
    """
    加载环境变量，自动检测 .env 文件位置
    """
    # 检测运行环境
    app_env = os.environ.get('APP_ENV', 'dev')
    
    # 根据环境确定项目根目录
    current_file = Path(__file__).resolve()
    if app_env == 'dev':
        # 开发环境：backend/.env
        project_root = current_file.parent.parent
    else:
        # 生产环境：/app/.env (Docker 容器中的工作目录)
        project_root = current_file.parent.parent
    
    env_path = project_root / '.env'
    
    # 加载 .env 文件
    if env_path.exists():
        environ.Env.read_env(str(env_path), overwrite=True)
    else:
        print(f"Warning: .env file not found at {env_path}")

# 立即加载环境变量
load_environment_variables()

# 导出环境变量访问器，供其他模块使用
__all__ = ['env']

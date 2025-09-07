"""
开发环境配置
"""
from .base import *
from ..env_config import (
    DEBUG,
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = DEBUG

# 开发环境CORS配置（其余 CORS 相关公共项在 base.py 定义）
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# 开发环境日志配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'celery': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
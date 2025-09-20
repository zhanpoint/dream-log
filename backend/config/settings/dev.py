"""
开发环境配置
"""
from .base import *
from ..env_manager import settings

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = settings.debug

# Django Debug Toolbar 设置
INTERNAL_IPS = [
    '127.0.0.1',
]

# 开发环境需要添加 CORS 和 Django Debug Toolbar 支持
INSTALLED_APPS = INSTALLED_APPS + [
    'corsheaders',  # 仅开发环境需要跨域支持
    'debug_toolbar',
]

# 开发环境中间件 - 添加 CORS 和 Debug Toolbar 中间件
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 必须放在最前面
    'debug_toolbar.middleware.DebugToolbarMiddleware',
] + MIDDLEWARE

# 开发环境CORS配置 - 仅开发环境需要处理跨域问题
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite 开发服务器
    "http://127.0.0.1:5173",  # Vite 开发服务器（IP访问）
]

# CORS 详细配置（针对 JWT 认证优化）
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET', 
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'authorization',    # JWT Token 认证头
    'content-type',     # JSON 请求必需
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
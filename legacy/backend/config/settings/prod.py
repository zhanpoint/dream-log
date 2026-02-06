"""
生产环境配置
"""
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# 生产环境安全设置
# SECURE_SSL_REDIRECT = True  # 该设置会导致 Django 将所有 HTTP 请求重定向到 HTTPS。但是在 Docker 容器内部，Nginx 和 Django 之间的通信是 HTTP 的，这导致了重定向循环。
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# 生产环境日志配置（仅控制台输出，避免文件依赖）
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'daphne': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted.web.http': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted.web.server': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery.task': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery.worker': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
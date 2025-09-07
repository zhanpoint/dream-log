"""
生产环境配置
"""
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# 生产环境CORS配置（其余 CORS 相关公共项在 base.py 定义）
CORS_ALLOWED_ORIGINS = [
    "https://dreamlog.xyz",
    "https://www.dreamlog.xyz",
]


# 生产环境安全设置
# SECURE_SSL_REDIRECT = True  # 该设置会导致 Django 将所有 HTTP 请求重定向到 HTTPS。但是在 Docker 容器内部，Nginx 和 Django 之间的通信是 HTTP 的，这导致了重定向循环。
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# 生产环境日志配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file', 'console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        # Daphne/Twisted HTTP日志 - 减少冗余输出
        'daphne': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted.web.http': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'twisted.web.server': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        # Celery日志 - 减少函数定义输出
        'celery': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery.task': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery.worker': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        # Channels日志
        'channels': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
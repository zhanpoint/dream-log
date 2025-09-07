"""
Django base settings for backend project.
基础配置文件，包含所有环境共享的配置
"""

from pathlib import Path
import os
from ..env_config import (
    REDIS_CONFIG, RABBITMQ_CONFIG,
    DJANGO_SECRET_KEY as ENV_DJANGO_SECRET_KEY,
    ALLOWED_HOSTS as ENV_ALLOWED_HOSTS,
    DATABASE as ENV_DATABASE,
    CACHES_CONFIG as ENV_CACHES_CONFIG,
    JWT_CONFIG as ENV_JWT_CONFIG,
    EMAIL_CONFIG as ENV_EMAIL_CONFIG,
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'channels',  # 使Django识别WebSocket功能
    'django_celery_beat',  # 用于管理Celery Beat定时任务
    
    # 本地应用
    'apps.core',
    'apps.dream', 
    'apps.user',
    'apps.ai_services',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True, #  Django 的模板加载器自动在每个 INSTALLED_APPS 的 templates 子目录中查找模板
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'zh-CN'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = False  # 这个设置为True时，Django内部使用UTC，只在展示时转换

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 自定义用户模型配置
AUTH_USER_MODEL = 'user.User'

# 密码哈希设置
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

# REST Framework 配置
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',  # 把数据转换成JSON格式返回
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',  # 解析JSON格式的请求数据
        'rest_framework.parsers.MultiPartParser',  # 解析文件上传数据
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # JWT认证
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # 允许任何用户访问API
    ],
}

# 由于WSGI只支持HTTP协议，而asgi模块支持WebSocket协议
ASGI_APPLICATION = 'config.asgi.application'

# 静态文件配置
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles_collected')

# Media files (User uploaded content)
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ============================= 通用基础配置（跨环境共享） =============================

# 安全与主机
SECRET_KEY = ENV_DJANGO_SECRET_KEY
ALLOWED_HOSTS = ENV_ALLOWED_HOSTS

# 数据库与缓存
DATABASES = ENV_DATABASE
CACHES = ENV_CACHES_CONFIG

# JWT 设置
SIMPLE_JWT = ENV_JWT_CONFIG

# Email 配置
EMAIL_BACKEND = ENV_EMAIL_CONFIG['backend']
EMAIL_HOST = ENV_EMAIL_CONFIG['host']
EMAIL_PORT = ENV_EMAIL_CONFIG['port']
EMAIL_USE_SSL = ENV_EMAIL_CONFIG['use_ssl']
EMAIL_USE_TLS = ENV_EMAIL_CONFIG['use_tls']
EMAIL_HOST_USER = ENV_EMAIL_CONFIG['username']
EMAIL_HOST_PASSWORD = ENV_EMAIL_CONFIG['password']
DEFAULT_FROM_EMAIL = ENV_EMAIL_CONFIG['default_from_email'] or EMAIL_HOST_USER

# CORS 公共配置（按环境仅覆盖 CORS_ALLOWED_ORIGINS）
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
]
CORS_EXPOSE_HEADERS = [
    'Content-Type',
    'Authorization',
]

# Celery 连接与序列化设置（统一从这里加载，celery_app 使用命名空间方式接入）
CELERY_BROKER_URL = (
    f"amqp://{RABBITMQ_CONFIG['user']}:{RABBITMQ_CONFIG['password']}@"
    f"{RABBITMQ_CONFIG['host']}:{RABBITMQ_CONFIG['port']}/{RABBITMQ_CONFIG['vhost']}"
)
CELERY_RESULT_BACKEND = (
    f"redis://:{REDIS_CONFIG['password']}@{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}/1"
)
CELERY_REDIS_MAX_CONNECTIONS = 10

# Celery 序列化与时区
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Shanghai'
CELERY_ENABLE_UTC = True

# 结果过期时间（秒）
CELERY_RESULT_EXPIRES = 3600  # 1小时

# 任务执行设置
CELERY_TASK_ACKS_LATE = True  # 确保"所有worker崩溃时"任务不会丢失
CELERY_TASK_REJECT_ON_WORKER_LOST = True  # 确保"单一worker崩溃时"任务不会丢失
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # 确保公平分发以确保能者多劳，提高了整体效率。

# 任务超时和重试设置
## 不使用 Celery 任务软/硬超时，避免 Windows 下信号问题
CELERY_TASK_SOFT_TIME_LIMIT = None  # 禁用软超时
CELERY_TASK_TIME_LIMIT = None  # 禁用硬超时
CELERY_TASK_MAX_RETRIES = 3  # 最大重试次数
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # 重试延迟60秒

# Worker性能优化
CELERY_WORKER_HIJACK_ROOT_LOGGER = False  # 不劫持根日志记录器
CELERY_WORKER_LOG_COLOR = False  # 生产环境关闭彩色日志
CELERY_WORKER_SEND_TASK_EVENTS = True  # 启用任务事件监控

# Celery 队列配置已在 celery_app.py 中详细定义

# Channels（WebSocket）跨环境共享配置（Redis DB 2）
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                f"redis://:{REDIS_CONFIG['password']}@{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}/2"
            ],
        },
    },
}

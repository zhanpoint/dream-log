"""
Django base settings for backend project.
基础配置文件，包含所有环境共享的配置
"""

from pathlib import Path
import os
from ..env_manager import env_manager

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
    'django_celery_beat',
    # 本地应用
    'apps.core',
    'apps.dream', 
    'apps.user',
    'apps.ai_services',
]

MIDDLEWARE = [
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

# Internationalization
LANGUAGE_CODE = 'zh-CN'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = False  # 这个设置为True时，Django内部使用UTC，只在展示时转换

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 自定义用户模型配置
AUTH_USER_MODEL = 'user.User'

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
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # 仅适用HTTP API 认证，用于常规的 REST API 请求，通过 HTTP Header 中的 Authorization: Bearer <token> 传递
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # 允许任何用户访问API
    ],
}

ASGI_APPLICATION = 'config.asgi.application'

# ============================= 通用基础配置（跨环境共享） =============================

# 安全与主机
SECRET_KEY = env_manager.secret_key
ALLOWED_HOSTS = env_manager.allowed_hosts

# 数据库与缓存
DATABASES = {'default': env_manager.database.default_database}
CACHES = env_manager.redis.cache_config

# JWT 设置
SIMPLE_JWT = env_manager.jwt.settings

# Email 配置
email_config = env_manager.email.settings
EMAIL_BACKEND = email_config['backend']
EMAIL_HOST = email_config['host']
EMAIL_PORT = email_config['port']
EMAIL_USE_SSL = email_config['use_ssl']
EMAIL_USE_TLS = email_config['use_tls']
EMAIL_HOST_USER = email_config['username']
EMAIL_HOST_PASSWORD = email_config['password']
DEFAULT_FROM_EMAIL = email_config['default_from_email'] or EMAIL_HOST_USER

# Celery 配置
celery_config = env_manager.celery.settings
CELERY_BROKER_URL = celery_config['broker_url']
CELERY_RESULT_BACKEND = celery_config['result_backend']
CELERY_REDIS_MAX_CONNECTIONS = celery_config['redis_max_connections']

# Celery 序列化与时区
CELERY_ACCEPT_CONTENT = celery_config['accept_content']
CELERY_TASK_SERIALIZER = celery_config['task_serializer']
CELERY_RESULT_SERIALIZER = celery_config['result_serializer']
CELERY_TIMEZONE = celery_config['timezone']
CELERY_ENABLE_UTC = celery_config['enable_utc']

# 结果过期时间（秒）
CELERY_RESULT_EXPIRES = celery_config['result_expires']

# 任务执行设置
CELERY_TASK_ACKS_LATE = celery_config['task_acks_late']
CELERY_TASK_REJECT_ON_WORKER_LOST = celery_config['task_reject_on_worker_lost']
CELERY_WORKER_PREFETCH_MULTIPLIER = celery_config['worker_prefetch_multiplier']

# 任务超时和重试设置
CELERY_TASK_SOFT_TIME_LIMIT = celery_config['task_soft_time_limit']
CELERY_TASK_TIME_LIMIT = celery_config['task_time_limit']
CELERY_TASK_MAX_RETRIES = celery_config['task_max_retries']
CELERY_TASK_DEFAULT_RETRY_DELAY = celery_config['task_default_retry_delay']

# Worker性能优化
CELERY_WORKER_HIJACK_ROOT_LOGGER = celery_config['worker_hijack_root_logger']
CELERY_WORKER_LOG_COLOR = celery_config['worker_log_color']
CELERY_WORKER_SEND_TASK_EVENTS = celery_config['worker_send_task_events']

# Channels（WebSocket）配置
CHANNEL_LAYERS = env_manager.redis.channels_config

STATIC_URL = '/static/'

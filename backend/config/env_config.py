"""
配置管理模块
负责加载和管理环境变量配置
配置加载链条：.env -> env_config.py -> base.py (统一构建) -> dev/prod (仅覆盖差异) -> celery_app 命名空间加载
"""

from pathlib import Path
from datetime import timedelta
import environ
import os

# 对需要进行类型转换的环境变量中进行初始化，
env = environ.Env(
    DEBUG=(bool, True),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1', '120.216.67.22']),
    DB_PORT=(int, 3306),
    REDIS_PORT=(int, 6379),
    REDIS_DB=(int, 0),
    RABBITMQ_PORT=(int, 5672),
    LANGGRAPH_DB_PORT=(int, 5432),
    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=(int, 1440),  # 24小时
    JWT_REFRESH_TOKEN_LIFETIME_DAYS=(int, 30),      # 30天
    EMAIL_PORT=(int, 465),
    EMAIL_USE_SSL=(bool, True),
    EMAIL_USE_TLS=(bool, False),
    SMS_SERVICE_ENABLED=(bool, False),
    EMAIL_SERVICE_ENABLED=(bool, True),
)

# 使用在 celery.py 中已经存在的 APP_ENV 变量来判断环境，更加可靠
app_env = os.environ.get('APP_ENV', 'dev')

# 根据开发环境读取.env文件
if app_env == 'dev':
    project_root = Path(__file__).resolve().parent.parent
else:
    project_root = Path(__file__).resolve().parent.parent.parent
env_path = project_root / '.env'

# 加载.env文件, 并强制覆盖已存在的环境变量
environ.Env.read_env(env_path, overwrite=True)

# Django基础配置
DEBUG = env('DEBUG')
DJANGO_SECRET_KEY = env('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# 数据库配置
DATABASE = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('DB_NAME', default='dream'),
        'USER': env('DB_USER', default='root'),
        'PASSWORD': env('DB_PASSWORD', default=''),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT'),
        'OPTIONS': {
            # 确保 Django 与 MySQL 之间的连接使用 utf8mb4 字符集，但并不会影响数据库本身的默认字符集
            'charset': 'utf8mb4',
            'init_command': "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_0900_ai_ci'",
        }
    }
}

# Redis配置(缓存0，celery1，websocket2)
REDIS_CONFIG = {
    'host': env('REDIS_HOST', default='127.0.0.1'),
    'port': env('REDIS_PORT'),
    'password': env('REDIS_PASSWORD', default=''),
    'db': env('REDIS_DB'),
}

# Redis缓存配置
CACHES_CONFIG = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://:{REDIS_CONFIG['password']}@{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}/0",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {'max_connections': 10},
            'PASSWORD': REDIS_CONFIG['password'],
        },
        'TIMEOUT': 1209600,  # 14天
    }
}

# RabbitMQ配置
RABBITMQ_CONFIG = {
    'host': env('RABBITMQ_HOST', default='127.0.0.1'),
    'port': env('RABBITMQ_PORT'),
    'user': env('RABBITMQ_DEFAULT_USER', default='guest'),
    'password': env('RABBITMQ_DEFAULT_PASS', default='guest'),
    'vhost': env('RABBITMQ_VHOST', default='/'),
}

ALIYUN_CONFIG = {
    'access_key_id': env('ALIYUN_ACCESS_KEY_ID', default=None),
    'access_key_secret': env('ALIYUN_ACCESS_KEY_SECRET', default=None),
    'oss_endpoint': env('ALIYUN_OSS_ENDPOINT', default=None),
    'oss_shared_bucket_name': env('ALIYUN_OSS_SHARED_BUCKET_NAME', default=None),
    'sts_role_oss_arn': env('ALIYUN_STS_ROLE_OSS_ARN', default=None),
    'sts_role_sms_arn': env('ALIYUN_STS_ROLE_SMS_ARN', default=None),
    'sms_sign_name': env('ALIYUN_SMS_SIGN', default=None),
    'sms_template_code_register': env('ALIYUN_SMS_TEMPLATE_REGISTER', default=None),
    'sms_template_code_login': env('ALIYUN_SMS_TEMPLATE_LOGIN', default=None),
    'sms_template_code_resetpassword': env('ALIYUN_SMS_TEMPLATE_RESETPASSWORD', default=None),
}

FEATURE_FLAGS = {
    'SMS_SERVICE_ENABLED': env('SMS_SERVICE_ENABLED'),
    'EMAIL_SERVICE_ENABLED': env('EMAIL_SERVICE_ENABLED'),
}

EMAIL_CONFIG = {
    'backend': 'django.core.mail.backends.smtp.EmailBackend',
    'host': env('EMAIL_HOST', default='smtpdm.aliyun.com'),
    'port': env('EMAIL_PORT', default=465),
    'use_ssl': env('EMAIL_USE_SSL', default=True),
    'use_tls': env('EMAIL_USE_TLS', default=False),
    'username': env('EMAIL_HOST_USER', default=None),
    'password': env('EMAIL_HOST_PASSWORD', default=None),
    'default_from_email': env('DEFAULT_FROM_EMAIL', default=None),
}

# JWT配置
# DRF SimpleJWT内部使用的是UTC时间来处理token的过期时间,OutstandingToken模型直接使用了JWT中的原始时间信息(UTC时间)
JWT_CONFIG = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env('JWT_ACCESS_TOKEN_LIFETIME_MINUTES')),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env('JWT_REFRESH_TOKEN_LIFETIME_DAYS')),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': DJANGO_SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# 代理配置
PROXY_URL = env('PROXY_URL', default=None)

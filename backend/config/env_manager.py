"""
现代化 Django 配置管理器
集中管理所有配置，提供类型安全和默认值
"""
from datetime import timedelta
from typing import Dict, List, Any
from .env_loader import env


class DatabaseConfig:
    """数据库配置"""
    
    @property
    def default_database(self) -> Dict[str, Any]:
        return {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST'),
            'PORT': env('DB_PORT'),
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_0900_ai_ci'",
            }
        }


class RedisConfig:
    """Redis 配置"""
    
    @property
    def connection_params(self) -> Dict[str, Any]:
        return {
            'host': env('REDIS_HOST'),
            'port': env('REDIS_PORT'),
            'password': env('REDIS_PASSWORD'),
            'db': env('REDIS_DB'),
        }
    
    @property
    def cache_config(self) -> Dict[str, Any]:
        params = self.connection_params
        return {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': f"redis://:{params['password']}@{params['host']}:{params['port']}/0",
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'CONNECTION_POOL_KWARGS': {'max_connections': 10},
                    'PASSWORD': params['password'],
                },
                'TIMEOUT': 1209600,  # 14天
            }
        }
    
    @property
    def celery_result_backend(self) -> str:
        params = self.connection_params
        return f"redis://:{params['password']}@{params['host']}:{params['port']}/1"
    
    @property
    def channels_config(self) -> Dict[str, Any]:
        params = self.connection_params
        return {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    'hosts': [
                        f"redis://:{params['password']}@{params['host']}:{params['port']}/2"
                    ],
                },
            },
        }


class RabbitMQConfig:
    """RabbitMQ 配置"""
    
    @property
    def connection_params(self) -> Dict[str, Any]:
        return {
            'host': env('RABBITMQ_HOST'),
            'port': env('RABBITMQ_PORT'),
            'user': env('RABBITMQ_DEFAULT_USER'),
            'password': env('RABBITMQ_DEFAULT_PASS'),
            'vhost': env('RABBITMQ_VHOST'),
        }
    
    @property
    def broker_url(self) -> str:
        params = self.connection_params
        return (
            f"amqp://{params['user']}:{params['password']}@"
            f"{params['host']}:{params['port']}/{params['vhost']}"
        )


class EmailConfig:
    """邮件配置"""
    
    @property
    def settings(self) -> Dict[str, Any]:
        return {
            'backend': 'django.core.mail.backends.smtp.EmailBackend',
            'host': env('EMAIL_HOST'),
            'port': env('EMAIL_PORT'),
            'use_ssl': env('EMAIL_USE_SSL'),
            'use_tls': env('EMAIL_USE_TLS'),
            'username': env('EMAIL_HOST_USER'),
            'password': env('EMAIL_HOST_PASSWORD'),
            'default_from_email': env('DEFAULT_FROM_EMAIL'),
        }


class JWTConfig:
    """JWT 配置"""
    
    @property
    def settings(self) -> Dict[str, Any]:
        return {
            'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env('JWT_ACCESS_TOKEN_LIFETIME_MINUTES')),
            'REFRESH_TOKEN_LIFETIME': timedelta(days=env('JWT_REFRESH_TOKEN_LIFETIME_DAYS')),
            'ROTATE_REFRESH_TOKENS': True,
            'BLACKLIST_AFTER_ROTATION': True,
            'UPDATE_LAST_LOGIN': True,
            'ALGORITHM': 'HS256',
            'SIGNING_KEY': env('DJANGO_SECRET_KEY'),
            'AUTH_HEADER_TYPES': ('Bearer',),
            'USER_ID_FIELD': 'id',
            'USER_ID_CLAIM': 'user_id',
        }


class AliyunConfig:
    """阿里云服务配置"""
    
    @property
    def settings(self) -> Dict[str, Any]:
        return {
            'access_key_id': env('ALIYUN_ACCESS_KEY_ID'),
            'access_key_secret': env('ALIYUN_ACCESS_KEY_SECRET'),
            'oss_endpoint': env('ALIYUN_OSS_ENDPOINT'),
            'oss_shared_bucket_name': env('ALIYUN_OSS_SHARED_BUCKET_NAME'),
            'sts_role_oss_arn': env('ALIYUN_STS_ROLE_OSS_ARN'),
            'sts_role_sms_arn': env('ALIYUN_STS_ROLE_SMS_ARN'),
            'sms_sign_name': env('ALIYUN_SMS_SIGN'),
            'sms_template_code_register': env('ALIYUN_SMS_TEMPLATE_REGISTER'),
            'sms_template_code_login': env('ALIYUN_SMS_TEMPLATE_LOGIN'),
            'sms_template_code_resetpassword': env('ALIYUN_SMS_TEMPLATE_RESETPASSWORD'),
            'endpoint': env('ALIYUN_OSS_ENDPOINT'),
        }


class AIServicesConfig:
    """AI 服务配置"""
    
    @property
    def openrouter_settings(self) -> Dict[str, str]:
        return {
            'api_key': env('OPENROUTER_API_KEY'),
            'models': env('OPENROUTER_MODELS'),
            'base_url': 'https://openrouter.ai/api/v1',
        }
    
    @property
    def embedding_settings(self) -> Dict[str, str]:
        return {
            'model': env('EMBEDDING_MODEL'),
        }
    
    @property
    def api_keys(self) -> Dict[str, str]:
        return {
            'google_api_key': env('GOOGLE_API_KEY'),
            'tavily_api_key': env('TAVILY_API_KEY'),
            'firecrawl_api_key': env('FIRECRAWL_API_KEY'),
            'voyage_api_key': env('VOYAGE_API_KEY'),
        }
    
    @property
    def chroma_settings(self) -> Dict[str, str]:
        return {
            'cloud_api_key': env('CHROMA_CLOUD_API_KEY'),
            'collection_name': env('CHROMA_COLLECTION_NAME'),
            'tenant': env('CHROMA_TENANT'),
            'database': env('CHROMA_DATABASE'),
        }


class LangGraphConfig:
    """LangGraph 数据库配置"""
    
    @property
    def database_settings(self) -> Dict[str, str]:
        return {
            'user': env('LANGGRAPH_DB_USER'),
            'password': env('LANGGRAPH_DB_PASSWORD'),
            'host': env('LANGGRAPH_DB_HOST'),
            'port': env('LANGGRAPH_DB_PORT'),
            'name': env('LANGGRAPH_DB_NAME'),
        }
    
    @property
    def connection_url(self) -> str:
        """构建数据库连接 URL"""
        db = self.database_settings
        return (
            f"postgresql://{db['user']}:{db['password']}@"
            f"{db['host']}:{db['port']}/{db['name']}"
        )


class FeatureFlags:
    """功能开关配置"""
    
    @property
    def settings(self) -> Dict[str, bool]:
        return {
            'SMS_SERVICE_ENABLED': env('SMS_SERVICE_ENABLED'),
            'EMAIL_SERVICE_ENABLED': env('EMAIL_SERVICE_ENABLED'),
            'RAG_ENABLED': env('RAG_ENABLED'),
        }


class CeleryConfig:
    """Celery 配置"""
    
    def __init__(self, rabbitmq_config: RabbitMQConfig, redis_config: RedisConfig):
        self.rabbitmq = rabbitmq_config
        self.redis = redis_config
    
    @property
    def settings(self) -> Dict[str, Any]:
        return {
            # 连接配置
            'broker_url': self.rabbitmq.broker_url,
            'result_backend': self.redis.celery_result_backend,
            'redis_max_connections': 10,
            
            # 序列化配置
            'accept_content': ['json'],
            'task_serializer': 'json',
            'result_serializer': 'json',
            'timezone': 'Asia/Shanghai',
            'enable_utc': True,
            
            # 任务配置
            'result_expires': 3600,  # 1小时
            'task_acks_late': True,
            'task_reject_on_worker_lost': True,
            'worker_prefetch_multiplier': 1,
            
            # 超时配置（Windows 兼容）
            'task_soft_time_limit': None,
            'task_time_limit': None,
            'task_max_retries': 3,
            'task_default_retry_delay': 60,
            
            # Worker 配置
            'worker_hijack_root_logger': False,
            'worker_log_color': False,
            'worker_send_task_events': True,
        }


class EnvManager:
    """
    统一的配置管理器
    所有配置通过这个类访问，提供类型安全和默认值
    """
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.rabbitmq = RabbitMQConfig()
        self.email = EmailConfig()
        self.jwt = JWTConfig()
        self.aliyun = AliyunConfig()
        self.ai_services = AIServicesConfig()
        self.langgraph = LangGraphConfig()
        self.features = FeatureFlags()
        self.celery = CeleryConfig(self.rabbitmq, self.redis)
    
    @property
    def secret_key(self) -> str:
        return env('DJANGO_SECRET_KEY')
    
    @property
    def debug(self) -> bool:
        return env('DEBUG')
    
    @property
    def allowed_hosts(self) -> List[str]:
        return env('ALLOWED_HOSTS')
    
    @property
    def proxy_url(self) -> str:
        return env('PROXY_URL')


# 创建全局配置实例
env_manager = EnvManager()

# 导出配置访问器
__all__ = ['env_manager', 'env']

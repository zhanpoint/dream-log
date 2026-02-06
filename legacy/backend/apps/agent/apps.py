from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AgentConfig(AppConfig):
    """
    Agent 应用配置
    智能代理相关功能配置
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.agent'
    verbose_name = '智能代理'

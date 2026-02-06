from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    """Core应用配置 - 系统核心功能模块"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = '系统核心'

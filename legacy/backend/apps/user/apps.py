from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class UserConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.user'
    verbose_name = '用户管理'

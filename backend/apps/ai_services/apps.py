from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AIServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_services'
    verbose_name = 'AI 服务'

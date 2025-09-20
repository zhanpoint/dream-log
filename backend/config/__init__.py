# 确保在 Django 启动时，Celery 应用总能被导入
from .celery_app import app as celery_app

__all__ = ('celery_app',)
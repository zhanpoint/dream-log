import os
from celery import Celery
from celery.schedules import crontab

# 在命令中设置环境变量（pycharm中配置的环境变量只在pycharm中生效）
app_env = os.environ.get('APP_ENV', 'dev')
settings_module = f'config.settings.{app_env}'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

# 注释掉这里的django.setup()，因为在Django启动时会造成循环导入
# django.setup() 应该只在独立脚本中调用，而不是在Django项目的模块中

# 创建一个 Celery 实例，名字为 'config'(推荐与 Django 项目同名)
app = Celery('config')

# 告诉 Celery 从 Django 的配置文件中加载配置（django.conf.settings中以 CELERY_ 开头的配置项）
# 导入 Django 的全局配置对象 settings，用于获取当前激活的配置内容（通常是你指定的 DJANGO_SETTINGS_MODULE 指向的模块，比如 config.settings.dev）
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动从所有已注册的 Django app 中查找并加载 tasks.py 文件中的任务函数
app.autodiscover_tasks()

# Celery Beat 任务调度器
app.conf.beat_schedule = {
    # 每日凌晨2点清理待删除图片
    'daily-image-cleanup': {
        'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_pending_delete_images',
        'schedule': crontab(hour=23, minute=0),  # 每天凌晨2点执行
        'options': {
            'expires': 3600,  # 任务1小时后过期
        }
    },
    
    # 每日凌晨3点清理僵尸图片
    'cleanup-orphan-images': {
        'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_orphan_images',
        'schedule': crontab(hour=23, minute=0),  # 每天凌晨3点执行
        'args': (30,),  # 清理30天前上传但未关联梦境的图片
        'options': {
            'expires': 3600,  # 任务1小时后过期
        }
    },
    
    # 清理过期的JWT令牌（保留原有任务）
    'cleanup-expired-tokens': {
        'task': 'apps.dream.tasks.token_tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=0, minute=30),  # 每天凌晨0:30执行
        'options': {
            'expires': 3600,
        }
    },

    # 每日凌晨4点清理过期的邮件验证码
    'cleanup-expired-email-codes': {
        'task': 'apps.user.tasks.email_tasks.cleanup_expired_email_codes',
        'schedule': crontab(hour=4, minute=0),
        'options': {
            'expires': 3600,
        }
    }
}
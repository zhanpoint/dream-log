import os
from celery import Celery
from celery.schedules import crontab

# 在命令中设置环境变量（pycharm中配置的环境变量只在pycharm中生效）
app_env = os.environ.get('APP_ENV', 'dev')
settings_module = f'config.settings.{app_env}'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

# 注释掉这里的django.setup()，因为在Django启动时会造成循环导入
# django.setup() 应该只在独立脚本中调用，而不是在Django项目的模块中

# 创建一个 Celery 实例，名字为 'DreamLog'(推荐与 Django 项目同名)
app = Celery('DreamLog')

# 告诉 Celery 从 Django 的配置文件中加载配置（django.conf.settings中以 CELERY_ 开头的配置项）
# 导入 Django 的全局配置对象 settings，用于获取当前激活的配置内容（通常是你指定的 DJANGO_SETTINGS_MODULE 指向的模块，比如 config.settings.dev）
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动从所有已注册的 Django app 中查找并加载 tasks.py 文件中的任务函数
app.autodiscover_tasks()
# 或者显式导入任务模块，避免自动发现时的问题
# app.autodiscover_tasks(['apps.ai_services.tasks', 'apps.dream.tasks', 'apps.user.tasks'])

# 配置 Celery Beat 调度器
app.conf.beat_scheduler = 'django_celery_beat.schedulers:DatabaseScheduler'

# 如果调度器被意外地改回默认的 `celery.beat.PersistentScheduler`，这些定时任务依然可以运行。
app.conf.beat_schedule = {
    # 每日凌晨2点清理待删除图片
    'daily-image-cleanup': {  # 调度条目的名称，Beat 使用这个名字来管理它的调度列表
        # Celery 在注册时，会根据这个任务函数的 Python 导入路径，自动生成任务名称，规则如下：'app的导入路径.tasks模块名.函数名'
        'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_pending_delete_images',  # 由 Celery Beat 发送给 Celery Worker的任务的名称，接被执行的 Celery 任务在任务注册表中的全名
        'schedule': crontab(hour=2, minute=0),  # 建议时间
        'options': {
            'expires': 3600,  # 任务1小时后过期
        }
    },
   
    # 每日凌晨3点清理僵尸图片
    'cleanup-orphan-images': {
        'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_orphan_images',
        'schedule': crontab(hour=3, minute=0),  # 建议时间
        'args': (30,),  # 清理30天前上传但未关联梦境的图片
        'options': {
            'expires': 3600,  # 任务1小时后过期
        }
    },
   
    # 清理过期的JWT令牌（保留原有任务）
    'cleanup-expired-tokens': {
        'task': 'apps.dream.tasks.token_tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=4, minute=0),  # 每天凌晨4:00执行
        'options': {
            'expires': 3600,
        }
    },

    # === 知识库相关定时任务 ===
    # 每日增量更新（凌晨1点）
    'daily-incremental-update': {
        'task': 'update_knowledge_base_incremental',
        'schedule': crontab(hour=6, minute=0),
        'args': (None, 30),  # 每次最多30个新URL
        'options': {
            'expires': 7200,  # 任务2小时后过期
        }
    },
   
    # 每周全面更新（周日凌晨2点）
    'weekly-comprehensive-update': {
        'task': 'build_comprehensive_knowledge_base',
        'schedule': crontab(hour=7, minute=0, day_of_week='sunday'),
        'args': (None, 100),  # 每次最多100个URL
        'options': {
            'expires': 14400,  # 任务4小时后过期
        }
    },
   
    # 每月象征知识库更新（每月1号凌晨3点）
    'monthly-symbol-update': {
        'task': 'build_symbol_knowledge_base',
        'schedule': crontab(hour=8, minute=0, day_of_month='1'),
        'args': (None, 8),  # 使用任务内默认象征，每个8个URL
        'options': {
            'expires': 7200,  # 任务2小时后过期
        }
    }
}
import os
import sys

from celery import Celery
from kombu import Exchange, Queue
from celery.signals import task_prerun, task_postrun, worker_process_init

# 在命令中设置环境变量（pycharm中配置的环境变量只在pycharm中生效）
app_env = os.environ.get('APP_ENV', 'dev')
# 根据开发测试生产环境设置settings模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'config.settings.{app_env}')

app = Celery('DreamLog')

# 从DJango配置文件中加载以 CELERY_ 开头的配置项
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现所有Django应用中的任务模块  
app.autodiscover_tasks()


# ================================队列和交换机配置================================

# 定义主交换机
tasks_exchange = Exchange('tasks', type='topic')

# 定义专用队列
app.conf.task_queues = (
    # I/O密集型队列 - 邮件、短信、网络请求
    Queue('io_queue', tasks_exchange, routing_key='tasks.io.#'),
    
    # 推送通知队列 - 消息推送、通知发送 (I/O密集型)
    Queue('push_queue', tasks_exchange, routing_key='tasks.push.#'),
    
    # 社区互动队列 - 评论、点赞、关注 (I/O密集型)  
    Queue('community_queue', tasks_exchange, routing_key='tasks.community.#'),
    
    # 支付处理队列 - 支付回调、账单处理 (高稳定性要求)
    Queue('payment_queue', tasks_exchange, routing_key='tasks.payment.#'),
    
    # CPU密集型队列 - AI分析、图片处理
    Queue('cpu_queue', tasks_exchange, routing_key='tasks.cpu.#'),
    
    # 长耗时任务队列 - 知识库构建、大数据处理
    Queue('long_tasks_queue', tasks_exchange, routing_key='tasks.long.#'),
    
    # 清理维护任务队列 - 定期清理、系统维护
    Queue('maintenance_queue', tasks_exchange, routing_key='tasks.maintenance.#'),
    
    # 默认队列 - 未分类的常规任务
    Queue('default_queue', tasks_exchange, routing_key='tasks.default.#'),
)

# 默认队列配置
app.conf.task_default_queue = 'default_queue'
app.conf.task_default_exchange = 'tasks'
app.conf.task_default_exchange_type = 'topic'
app.conf.task_default_routing_key = 'tasks.default.general'

# 任务路由配置 - 使用通配符模式简化配置
app.conf.task_routes = {
    # I/O密集型任务 - 邮件、短信、网络请求
    'apps.user.tasks.email_tasks.*': {'queue': 'io_queue'},
    'apps.user.tasks.sms_tasks.*': {'queue': 'io_queue'},
    'apps.core.tasks.email_tasks.*': {'queue': 'io_queue'},
    'apps.dream.tasks.image_cleanup_tasks.schedule_image_deletion': {'queue': 'io_queue'},
    'apps.ai_services.tasks.dream_analysis_tasks.*': {'queue': 'io_queue'},
}


# ================================配置 Celery Beat 调度器================================
# 使用数据库调度器，定时任务通过Django管理命令注册到数据库
app.conf.beat_scheduler = 'django_celery_beat.schedulers:DatabaseScheduler'
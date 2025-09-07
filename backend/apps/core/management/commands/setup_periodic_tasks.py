import json
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django_celery_beat.models import PeriodicTask, CrontabSchedule
from celery.schedules import crontab

class Command(BaseCommand):
    """
    设置 Dream Log 项目的定时任务到数据库中供 Celery Beat 调度器使用
    
    功能特点:
    1. 幂等性: 可安全重复运行，使用 --overwrite 强制更新现有任务
    2. 事务安全: 每个任务独立事务处理
    3. 队列路由: 自动根据任务类型分配到合适的队列
    
    使用方法:
    python manage.py setup_periodic_tasks --overwrite
    """
    help = "在数据库中设置 Dream Log 项目的定时任务"

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            dest='overwrite',
            default=False,
            help='Overwrite existing periodic tasks schedules and arguments.',
        )


    def get_task_definitions(self):
        """定义项目中的定时任务配置"""
        return {
            # 图片清理任务
            'daily-image-cleanup': {
                'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_pending_delete_images',
                'schedule': crontab(hour=2, minute=0),
                'queue': 'maintenance_queue',
                'description': '每日凌晨2点清理待删除图片'
            },
            'cleanup-orphan-images': {
                'task': 'apps.dream.tasks.image_cleanup_tasks.cleanup_orphan_images',
                'schedule': crontab(hour=3, minute=0),
                'args': [30],
                'queue': 'maintenance_queue',
                'description': '每日凌晨3点清理30天前的僵尸图片'
            },
            
            # Token清理任务
            'cleanup-expired-tokens': {
                'task': 'apps.dream.tasks.token_tasks.cleanup_expired_tokens',
                'schedule': crontab(hour=4, minute=0),
                'queue': 'maintenance_queue',
                'description': '每日凌晨4点清理过期JWT令牌'
            },
            
            # 知识库维护任务
            'daily-incremental-update': {
                'task': 'apps.ai_services.tasks.knowledge_base_tasks.update_knowledge_base_incremental_task',
                'schedule': crontab(hour=6, minute=0),
                'args': [None, 30],
                'queue': 'maintenance_queue',
                'description': '每日凌晨6点增量更新知识库'
            },
            'weekly-comprehensive-update': {
                'task': 'apps.ai_services.tasks.knowledge_base_tasks.build_comprehensive_knowledge_base_task',
                'schedule': crontab(hour=7, minute=0, day_of_week='sunday'),
                'args': [None, 100],
                'queue': 'long_tasks_queue',
                'description': '每周日凌晨7点全面更新知识库'
            },
            'monthly-symbol-update': {
                'task': 'apps.ai_services.tasks.knowledge_base_tasks.build_symbol_knowledge_base_task',
                'schedule': crontab(hour=8, minute=0, day_of_month='1'),
                'args': [None, 8],
                'queue': 'long_tasks_queue',
                'description': '每月1号凌晨8点更新象征知识库'
            }
        }

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('开始设置定时任务...'))
        overwrite = options['overwrite']
        task_definitions = self.get_task_definitions()

        success_count = 0
        error_count = 0

        for name, task_info in task_definitions.items():
            try:
                with transaction.atomic():
                    if self.setup_task(name, task_info, overwrite):
                        success_count += 1
                    else:
                        error_count += 1
            except Exception as e:
                error_count += 1
                self.stderr.write(self.style.ERROR(f'设置任务 "{name}" 时发生错误: {e}'))

        self.stdout.write(self.style.SUCCESS(f'定时任务设置完成: 成功 {success_count} 个, 失败 {error_count} 个'))

    def setup_task(self, name, task_info, overwrite):
        """处理单个定时任务的创建或更新"""
        task_name = task_info['task']
        schedule = task_info['schedule']
        args = task_info.get('args', [])
        kwargs = task_info.get('kwargs', {})
        queue = task_info.get('queue', 'default_queue')
        description = task_info.get('description', '')

        # 创建 Crontab 调度对象
        crontab_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=schedule.minute, 
            hour=schedule.hour, 
            day_of_week=schedule.day_of_week,
            day_of_month=schedule.day_of_month, 
            month_of_year=schedule.month_of_year,
            timezone=timezone.get_current_timezone()
        )

        # 任务配置
        defaults = {
            'task': task_name,
            'crontab': crontab_schedule,
            'args': json.dumps(args),
            'kwargs': json.dumps(kwargs),
            'queue': queue,
            'enabled': True,
            'description': description
        }

        # 创建或更新任务
        task_obj, created = PeriodicTask.objects.get_or_create(name=name, defaults=defaults)

        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ 创建定时任务: "{name}" - {description}'))
            return True
        elif overwrite:
            for key, value in defaults.items():
                setattr(task_obj, key, value)
            task_obj.save()
            self.stdout.write(self.style.SUCCESS(f'✓ 更新定时任务: "{name}" - {description}'))
            return True
        else:
            self.stdout.write(self.style.NOTICE(f'⚠ 任务 "{name}" 已存在，使用 --overwrite 可强制更新'))
            return False

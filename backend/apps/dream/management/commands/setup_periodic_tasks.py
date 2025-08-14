import json
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import FieldDoesNotExist
from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule
from config.celery import app as celery_app
from celery.schedules import crontab, schedule as celery_schedule

class Command(BaseCommand):
    """
    一个健壮的 Django 管理命令，用于从 Celery 配置中初始化或更新数据库中的定时任务。

    遵循最佳实践:
    1. 独立事务: 每个任务的设置都在其自己的事务中处理，防止一个任务的失败影响其他任务。
    2. 智能过期处理: 自动检测 django-celery-beat 版本，并正确使用 `expire_seconds` (新版) 或 `expires` (旧版)。
    3. 幂等性: 命令可以安全地重复运行。使用 `--overwrite` 会强制更新现有任务。
    4. 清晰的日志: 提供详细的成功、跳过或失败信息。
    python manage.py setup_periodic_tasks --overwrite
    """
    help = "Sets up the periodic tasks for Celery Beat from the project's configuration."

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            dest='overwrite',
            default=False,
            help='Overwrite existing periodic tasks schedules and arguments.',
        )

    def _model_has_field(self, model, field_name):
        """检查模型是否存在特定字段"""
        try:
            model._meta.get_field(field_name)
            return True
        except FieldDoesNotExist:
            return False

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to set up periodic tasks...'))
        overwrite = options['overwrite']
        schedule_definitions = celery_app.conf.get('beat_schedule', {})
        
        if not schedule_definitions:
            self.stdout.write(self.style.WARNING('No beat_schedule found in celery config. Exiting.'))
            return

        # 检查当前 PeriodicTask 模型支持 expire_seconds 还是 expires
        supports_expire_seconds = self._model_has_field(PeriodicTask, 'expire_seconds')

        for name, schedule_info in schedule_definitions.items():
            # 为每个任务使用独立的原子事务
            try:
                with transaction.atomic():
                    self.setup_task(name, schedule_info, overwrite, supports_expire_seconds)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'A critical error occurred while setting up task "{name}": {e}'))

        self.stdout.write(self.style.SUCCESS('Periodic tasks setup complete.'))

    def setup_task(self, name, schedule_info, overwrite, supports_expire_seconds):
        """处理单个定时任务的创建或更新"""
        task_name = schedule_info['task']
        schedule = schedule_info['schedule']
        args = schedule_info.get('args', [])
        kwargs = schedule_info.get('kwargs', {})
        options_dict = schedule_info.get('options', {})

        # --- 调度对象处理 ---
        if isinstance(schedule, crontab):
            crontab_schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=schedule.minute, hour=schedule.hour, day_of_week=schedule.day_of_week,
                day_of_month=schedule.day_of_month, month_of_year=schedule.month_of_year,
                timezone=timezone.get_current_timezone()
            )
            selected_schedule = crontab_schedule
        elif isinstance(schedule, celery_schedule):
            interval_schedule, _ = IntervalSchedule.objects.get_or_create(
                every=schedule.run_every.total_seconds(), period=IntervalSchedule.SECONDS
            )
            selected_schedule = interval_schedule
        else:
            self.stdout.write(self.style.ERROR(f'Unsupported schedule type for task {name}: {type(schedule)}'))
            return

        # --- 任务默认值和过期处理 ---
        defaults = {
            'task': task_name,
            'args': json.dumps(args),
            'kwargs': json.dumps(kwargs),
        }
        if isinstance(selected_schedule, CrontabSchedule):
            defaults['crontab'] = selected_schedule
        elif isinstance(selected_schedule, IntervalSchedule):
            defaults['interval'] = selected_schedule

        expires_raw = options_dict.get('expires')
        if isinstance(expires_raw, int):
            if supports_expire_seconds:
                defaults['expire_seconds'] = expires_raw
            else:
                # 如果模型不支持 expire_seconds，则计算绝对过期时间
                defaults['expires'] = timezone.now() + timedelta(seconds=expires_raw)
        elif isinstance(expires_raw, timedelta):
             if supports_expire_seconds:
                defaults['expire_seconds'] = expires_raw.total_seconds()
             else:
                defaults['expires'] = timezone.now() + expires_raw
        elif expires_raw is not None:
             # 支持直接传递 datetime 对象
             defaults['expires'] = expires_raw

        # --- 创建或更新任务 ---
        task_obj, created = PeriodicTask.objects.get_or_create(name=name, defaults=defaults)

        if created:
            self.stdout.write(self.style.SUCCESS(f'Successfully created periodic task: "{name}"'))
        elif overwrite:
            for key, value in defaults.items():
                setattr(task_obj, key, value)
            
            # 确保在覆盖时清除另一个调度类型
            if isinstance(selected_schedule, CrontabSchedule):
                task_obj.interval = None
            else:
                task_obj.crontab = None

            # 清除不支持的过期字段
            if supports_expire_seconds:
                if 'expires' in defaults and self._model_has_field(PeriodicTask, 'expires'):
                    task_obj.expires = None
            else:
                if 'expire_seconds' in defaults:
                    task_obj.expire_seconds = None

            task_obj.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully updated periodic task: "{name}"'))
        else:
            self.stdout.write(self.style.NOTICE(f'Task "{name}" already exists. Use --overwrite to update.'))

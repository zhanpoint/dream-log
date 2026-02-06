"""
Django管理命令：用于手动触发知识库构建过程
用法: python manage.py build_knowledge_base [options]
"""
import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ...tasks.knowledge_base_tasks import (
    build_comprehensive_knowledge_base_task,
    update_knowledge_base_incremental_task,
    build_symbol_knowledge_base_task
)
from ...prompts.knowledge_base_search_prompts import COMMON_DREAM_SYMBOLS


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '通过Celery异步任务构建梦境知识库'
    
    # 标记此命令对部署安全（异步任务，不会阻塞部署）
    SAFE_FOR_DEPLOYMENT = False
    
    def add_arguments(self, parser):
        """
        添加命令行参数
        """
        parser.add_argument(
            '--categories',
            nargs='+',
            type=str,
            choices=['symbols', 'psychology', 'science', 'interpretation'],
            help='要构建的知识库类别 (仅用于comprehensive/incremental模式)'
        )

        parser.add_argument(
            '--max-urls',
            type=int,
            default=100,
            help='最大URL数量 (默认: 100, 用于comprehensive/incremental模式)'
        )
        
        parser.add_argument(
            '--symbols',
            nargs='+',
            type=str,
            help='要构建的特定梦境象征列表 (仅用于symbols模式)'
        )
        
        parser.add_argument(
            '--mode',
            type=str,
            choices=['comprehensive', 'incremental', 'symbols'],
            default='comprehensive',
            help='构建模式: comprehensive(全面), incremental(增量), symbols(象征) (默认: comprehensive)'
        )
        
        parser.add_argument(
            '--max-urls-symbol',
            type=int,
            default=10,
            help='每个象征的最大URL数量 (默认: 10, 仅用于symbols模式)'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='显示详细输出'
        )
    
    def handle(self, *args, **options):
        """执行命令，触发Celery任务"""
        start_time = timezone.now()
        
        if options['verbose']:
            logging.basicConfig(level=logging.INFO)
        
        self.stdout.write(
            self.style.SUCCESS(f"开始触发知识库构建任务 - {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        )
        
        try:
            mode = options['mode']
            
            if mode == 'comprehensive':
                self.stdout.write("\n触发[全面]知识库构建任务...")
                categories = options.get('categories')
                max_urls = options['max_urls']
                build_comprehensive_knowledge_base_task.apply_async(args=(categories, max_urls), ignore_result=True)

            elif mode == 'incremental':
                self.stdout.write("\n触发[增量]知识库更新任务...")
                categories = options.get('categories')
                max_urls = min(options['max_urls'], 30)  # 增量更新限制URL数量
                update_knowledge_base_incremental_task.apply_async(args=(categories, max_urls), ignore_result=True)

            elif mode == 'symbols':
                self.stdout.write("\n触发[象征]知识库构建任务...")
                symbols = options.get('symbols')
                if not symbols:
                    symbols = COMMON_DREAM_SYMBOLS[:15]
                
                max_urls_symbol = options['max_urls_symbol']
                build_symbol_knowledge_base_task.apply_async(args=(symbols, max_urls_symbol), ignore_result=True)

            else:
                raise CommandError(f"未知模式: {mode}")

            self.stdout.write(self.style.SUCCESS("\n构建任务已成功加入队列！"))

        except Exception as e:
            logger.error(f"触发知识库构建任务时出错: {e}", exc_info=True)
            raise CommandError(f"任务触发失败: {e}")
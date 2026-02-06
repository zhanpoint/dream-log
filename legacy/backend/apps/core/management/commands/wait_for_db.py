import time
from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """等待数据库连接就绪"""
    
    def add_arguments(self, parser):
        parser.add_argument('--timeout', type=int, default=30)
    
    def handle(self, *args, **options):
        start_time = time.time()
        
        while time.time() - start_time < options['timeout']:
            try:
                connections['default'].cursor().execute('SELECT 1')
                self.stdout.write(self.style.SUCCESS('数据库就绪'))
                return
            except OperationalError:
                time.sleep(1)
        
        raise CommandError('数据库连接超时')

"""
Django管理命令：CICD自动化部署时自动发现并执行所有初始化命令
用法: python manage.py auto_deploy_setup
"""
import importlib
from typing import List
from dataclasses import dataclass

from django.core.management.base import BaseCommand
from django.core.management import get_commands, call_command


@dataclass
class DeployCommand:
    """部署命令信息"""
    name: str
    app_label: str
    priority: int


class Command(BaseCommand):
    """CICD自动化部署命令执行器"""
    
    help = 'CICD部署时自动执行标记为安全的部署命令'
    
    # 系统命令黑名单
    SYSTEM_COMMANDS = {
        'check', 'migrate', 'runserver', 'shell', 'test', 'collectstatic', 
        'makemigrations', 'createsuperuser', 'auto_deploy_setup'
    }
    
    # 命令优先级
    PRIORITY_MAP = {
        'create_categories': 100,
        'setup_periodic_tasks': 90,
        'build_knowledge_base': 80,
    }

    def handle(self, *args, **options):
        # 发现并执行命令
        commands = self._discover_commands()
        if not commands:
            return
        
        # 按优先级排序并执行
        commands.sort(key=lambda x: x.priority, reverse=True)
        self._execute(commands)

    def _discover_commands(self) -> List[DeployCommand]:
        """发现标记为SAFE_FOR_DEPLOYMENT的命令"""
        commands = []
        available_commands = get_commands()
        
        for cmd_name, app_name in available_commands.items():
            if cmd_name in self.SYSTEM_COMMANDS:
                continue
            
            # 只检查安全性标记
            if self._is_safe_command(cmd_name, app_name):
                commands.append(DeployCommand(
                    name=cmd_name,
                    app_label=app_name,
                    priority=self.PRIORITY_MAP.get(cmd_name, 50)
                ))
        
        return commands

    def _is_safe_command(self, cmd_name: str, app_name: str) -> bool:
        """检查命令是否标记为SAFE_FOR_DEPLOYMENT"""
        try:
            for module_path in [f"apps.{app_name}.management.commands.{cmd_name}",
                               f"{app_name}.management.commands.{cmd_name}"]:
                try:
                    module = importlib.import_module(module_path)
                    command_class = getattr(module, 'Command', None)
                    if command_class:
                        return getattr(command_class, 'SAFE_FOR_DEPLOYMENT', False)
                except ImportError:
                    continue
        except Exception:
            pass
        
        return False

    def _execute(self, commands: List[DeployCommand]):
        """执行命令"""
        for cmd in commands:
            try:
                kwargs = {'verbosity': 1}
                
                # 特殊参数处理
                if cmd.name == 'setup_periodic_tasks':
                    kwargs['overwrite'] = True
                
                call_command(cmd.name, **kwargs)
                
            except Exception as e:
                self.stderr.write(f'命令 {cmd.name} 执行失败: {e}')
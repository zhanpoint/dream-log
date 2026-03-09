"""
启动 Arq Worker

运行命令:
    python -m scripts.start_worker

或者使用 arq 命令:
    arq app.core.arq_app.WorkerSettings
"""

import asyncio
import sys

from arq import run_worker

from app.core.arq_app import WorkerSettings


def main():
    """主函数 - 修复 Python 3.14 的事件循环问题"""
    try:
        # Python 3.14+ 需要显式创建事件循环
        if sys.version_info >= (3, 10):
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        
        run_worker(WorkerSettings)
    except KeyboardInterrupt:
        print("\n⚠️  Worker 被中断")
        sys.exit(0)


if __name__ == "__main__":
    main()

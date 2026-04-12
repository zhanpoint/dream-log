"""启动 Arq Worker。

本地 / Docker 统一入口：``python -m scripts.start_worker``（与 docker-compose worker 一致）。
等价 CLI：``arq app.core.arq_app.WorkerSettings``（需 arq 在 PATH）。
"""

from arq import run_worker

from app.core.arq_app import WorkerSettings

if __name__ == "__main__":
    run_worker(WorkerSettings)

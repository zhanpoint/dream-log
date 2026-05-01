"""Backend CLI entry points."""

import asyncio
import os
from pathlib import Path

import uvicorn
from arq import run_worker

from app.core.arq_app import WorkerSettings

DEFAULT_DEV_HOST = "127.0.0.1"
DEFAULT_DEV_PORT = 8001
APP_DIR = Path(__file__).resolve().parent
APP_MODULE_DIR = APP_DIR.name
RELOAD_EXCLUDES = [f"{APP_MODULE_DIR}/cli.py"]


def run_dev() -> None:
    """Run the FastAPI app in local development mode."""
    host = DEFAULT_DEV_HOST
    port = DEFAULT_DEV_PORT

    os.environ["HOST"] = host
    os.environ["PORT"] = str(port)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        reload_dirs=[str(APP_DIR)],
        reload_excludes=RELOAD_EXCLUDES,
    )


def run_worker_command() -> None:
    """Create an event loop explicitly before starting the arq worker."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        run_worker(WorkerSettings)
    finally:
        asyncio.set_event_loop(None)
        loop.close()

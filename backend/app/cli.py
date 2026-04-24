"""Backend CLI entry points."""

import asyncio

import uvicorn
from arq import run_worker

from app.core.arq_app import WorkerSettings


def run_dev() -> None:
    """Run the FastAPI app in local development mode."""
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


def run_worker_command() -> None:
    """Create an event loop explicitly before starting the arq worker."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        run_worker(WorkerSettings)
    finally:
        asyncio.set_event_loop(None)
        loop.close()

import asyncio
import unittest
from unittest.mock import patch

from app.cli import run_worker_command
from scripts.start_worker import main


class StartWorkerTests(unittest.TestCase):
    def test_run_worker_command_registers_event_loop_before_running_worker(self) -> None:
        def fake_run_worker(_: object) -> None:
            loop = asyncio.get_event_loop()
            self.assertFalse(loop.is_closed())

        with patch("app.cli.run_worker", side_effect=fake_run_worker) as mocked:
            run_worker_command()

        mocked.assert_called_once()
        with self.assertRaises(RuntimeError):
            asyncio.get_event_loop()

    def test_start_worker_main_delegates_to_cli_entry_point(self) -> None:
        with patch("scripts.start_worker.run_worker_command") as mocked:
            main()

        mocked.assert_called_once_with()

import os
import unittest
from unittest.mock import patch

from app.cli import (
    APP_DIR,
    APP_MODULE_DIR,
    DEFAULT_DEV_HOST,
    DEFAULT_DEV_PORT,
    RELOAD_EXCLUDES,
    run_dev,
)


class CliTests(unittest.TestCase):
    def test_reload_excludes_uses_relative_pattern(self) -> None:
        self.assertEqual(RELOAD_EXCLUDES, [f"{APP_MODULE_DIR}/cli.py"])

    def test_run_dev_uses_fixed_local_port(self) -> None:
        with patch("app.cli.uvicorn.run") as mocked_run:
            run_dev()

        mocked_run.assert_called_once_with(
            "app.main:app",
            host=DEFAULT_DEV_HOST,
            port=DEFAULT_DEV_PORT,
            reload=True,
            reload_dirs=[str(APP_DIR)],
            reload_excludes=RELOAD_EXCLUDES,
        )
        self.assertEqual(os.environ["HOST"], DEFAULT_DEV_HOST)
        self.assertEqual(os.environ["PORT"], str(DEFAULT_DEV_PORT))

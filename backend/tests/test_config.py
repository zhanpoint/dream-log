import unittest

from app.core.config import (
    DEV_FRONTEND_ORIGINS,
    _split_origins,
    _unique_preserving_order,
)


class ConfigHelpersTests(unittest.TestCase):
    def test_split_origins_filters_empty_entries(self) -> None:
        self.assertEqual(
            _split_origins("http://localhost:3000, ,http://127.0.0.1:3000"),
            ["http://localhost:3000", "http://127.0.0.1:3000"],
        )

    def test_unique_preserving_order_keeps_first_occurrence(self) -> None:
        self.assertEqual(
            _unique_preserving_order(
                ["http://localhost:3001", "http://localhost:3001", "http://127.0.0.1:3001"]
            ),
            ["http://localhost:3001", "http://127.0.0.1:3001"],
        )

    def test_dev_frontend_origins_match_fixed_local_ports(self) -> None:
        self.assertEqual(
            DEV_FRONTEND_ORIGINS,
            ["http://localhost:3001", "http://127.0.0.1:3001"],
        )

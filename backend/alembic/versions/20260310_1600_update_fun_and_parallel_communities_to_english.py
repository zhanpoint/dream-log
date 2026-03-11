"""Update fun-dreams-share and parallel-world-dreams to English.

Revision ID: 20260310_1600
Revises: 20260310_1500
Create Date: 2026-03-10 16:00:00

"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260310_1600"
down_revision: Union[str, None] = "20260310_1500"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _escape(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    updates = [
        (
            "fun-dreams-share",
            "Fun Dream Gathering",
            "Share absurd, funny, and unbelievable dreams and enjoy lighthearted dream moments.",
        ),
        (
            "parallel-world-dreams",
            "Parallel World Dreams",
            "Dreamed of another world or another life? Record and discuss parallel-universe dreams together.",
        ),
    ]
    for slug, name, description in updates:
        op.execute(
            "UPDATE communities "
            f"SET name = '{_escape(name)}', description = '{_escape(description)}' "
            f"WHERE slug = '{_escape(slug)}'"
        )


def downgrade() -> None:
    pass

"""Update official community names/descriptions to English.

Revision ID: 20260310_1500
Revises: 20260309_1200
Create Date: 2026-03-10 15:00:00

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260310_1500"
down_revision: Union[str, None] = "20260309_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _escape(value: str) -> str:
    """Escape single quotes for use in SQL string literals."""
    return value.replace("'", "''")


def upgrade() -> None:
    """Update existing official communities to English text."""

    updates = [
        (
            "lucid-dreaming",
            "Lucid Dream Lab",
            "Explore the secrets of lucid dreams and share techniques and experiences.",
        ),
        (
            "nightmare-support",
            "Nightmare Support Group",
            "Face nightmares together with mutual support, understanding, and care.",
        ),
        (
            "serial-dreams",
            "Serial Dream Theater",
            "Share serialized dream stories with continuing plots and characters.",
        ),
        (
            "flying-dreams",
            "Flying Dream Institute",
            "All dreams about flying and the feeling of freedom in the air.",
        ),
    ]

    for slug, name, description in updates:
        sql = (
            "UPDATE communities "
            f"SET name = '{_escape(name)}', "
            f"description = '{_escape(description)}' "
            f"WHERE slug = '{_escape(slug)}'"
        )
        op.execute(sql)


def downgrade() -> None:
    # 为了避免数据丢失，这里不尝试恢复到原来的中文文案
    # 如果确实需要回滚，可在此处根据业务需要补充中文内容
    pass




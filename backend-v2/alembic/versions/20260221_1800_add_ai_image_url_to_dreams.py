"""Add ai_image_url to dreams table.

Revision ID: 20260221_1800
Revises: 20260213_1400
Create Date: 2026-02-21 18:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260221_1800"
down_revision: Union[str, None] = "e0987f1391d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.add_column(
            sa.Column("ai_image_url", sa.Text(), nullable=True, comment="AI 生成的梦境图像 OSS URL")
        )


def downgrade() -> None:
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.drop_column("ai_image_url")

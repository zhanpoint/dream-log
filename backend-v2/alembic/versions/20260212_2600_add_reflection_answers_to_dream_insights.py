"""Add reflection_answers to dream_insights

Revision ID: 20260212_2600
Revises: 20260212_2500
Create Date: 2026-02-12 26:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260212_2600"
down_revision: Union[str, None] = "20260212_2500"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "dream_insights",
        sa.Column(
            "reflection_answers",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("dream_insights", "reflection_answers")


"""Add exploration_symbols and exploration_articles tables.

Revision ID: 20260222_1200
Revises: 20260221_1800
Create Date: 2026-02-22 12:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "20260222_1200"
down_revision: Union[str, None] = "20260221_1800"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exploration_symbols",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("search_text", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_exploration_symbols_slug", "exploration_symbols", ["slug"])
    op.create_index("idx_exploration_symbols_category", "exploration_symbols", ["category"])

    op.create_table(
        "exploration_articles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("section", sa.String(200), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
        ),
    )
    op.create_index(
        "idx_exploration_articles_module",
        "exploration_articles",
        ["module", "order_index"],
    )


def downgrade() -> None:
    op.drop_index("idx_exploration_articles_module", table_name="exploration_articles")
    op.drop_table("exploration_articles")
    op.drop_index("idx_exploration_symbols_category", table_name="exploration_symbols")
    op.drop_index("idx_exploration_symbols_slug", table_name="exploration_symbols")
    op.drop_table("exploration_symbols")

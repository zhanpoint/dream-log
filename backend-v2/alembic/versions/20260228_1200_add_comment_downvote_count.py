"""add comment downvote_count for 赞同/反对

Revision ID: 20260228_1200
Revises: 20260228_1100
Create Date: 2026-02-28 12:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260228_1200"
down_revision = "20260228_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "comments",
        sa.Column("downvote_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("comments", "downvote_count")

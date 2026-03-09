"""add share_count to dreams

Revision ID: 20260228_1000
Revises: 20260227_1200
Create Date: 2026-02-28 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260228_1000"
down_revision = "20260227_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dreams", sa.Column("share_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("dreams", "share_count")

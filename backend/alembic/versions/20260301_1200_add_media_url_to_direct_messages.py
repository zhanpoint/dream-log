"""add media_url to direct_messages

Revision ID: 20260301_1200
Revises: 20260228_1200
Create Date: 2026-03-01 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260301_1200"
down_revision = "20260228_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("direct_messages", sa.Column("media_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("direct_messages", "media_url")

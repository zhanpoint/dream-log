"""add feature mode fields to dreams

Revision ID: 20260302_1500
Revises: 20260301_1200
Create Date: 2026-03-02 15:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260302_1500"
down_revision = "20260301_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dreams",
        sa.Column("feature_mode", sa.String(length=16), nullable=False, server_default="AUTO"),
    )
    op.add_column("dreams", sa.Column("featured_reason", sa.Text(), nullable=True))
    op.add_column("dreams", sa.Column("featured_score_snapshot", sa.Float(), nullable=True))
    op.add_column("dreams", sa.Column("featured_updated_by", postgresql.UUID(as_uuid=True), nullable=True))


def downgrade() -> None:
    op.drop_column("dreams", "featured_updated_by")
    op.drop_column("dreams", "featured_score_snapshot")
    op.drop_column("dreams", "featured_reason")
    op.drop_column("dreams", "feature_mode")

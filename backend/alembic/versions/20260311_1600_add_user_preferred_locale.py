"""add user preferred locale

Revision ID: 20260311_1600
Revises: 20260310_1600
Create Date: 2026-03-11 16:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260311_1600"
down_revision = "20260310_1600"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("preferred_locale", sa.String(length=16), nullable=True))
    op.create_index("idx_users_preferred_locale", "users", ["preferred_locale"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_users_preferred_locale", table_name="users")
    op.drop_column("users", "preferred_locale")


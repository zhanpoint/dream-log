"""add user asset visibility settings

Revision ID: 20260309_1200
Revises: 20260309_1100
Create Date: 2026-03-09 12:00:00
"""

from alembic import op


revision = "20260309_1200"
down_revision = "20260309_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bookmarks_visibility VARCHAR(20) NOT NULL DEFAULT 'private';
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS created_communities_visibility VARCHAR(20) NOT NULL DEFAULT 'private';
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS joined_communities_visibility VARCHAR(20) NOT NULL DEFAULT 'private';
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS joined_communities_visibility;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS created_communities_visibility;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS bookmarks_visibility;")

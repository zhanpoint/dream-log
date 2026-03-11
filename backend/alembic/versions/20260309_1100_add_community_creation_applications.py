"""add community creation applications

Revision ID: 20260309_1100
Revises: 20260309_1000
Create Date: 2026-03-09 11:00:00
"""

from alembic import op


revision = "20260309_1100"
down_revision = "20260309_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS community_creation_applications (
            id UUID PRIMARY KEY,
            applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT NULL,
            motivation TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            review_note TEXT NULL,
            reviewer_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ NULL,
            created_community_id UUID NULL REFERENCES communities(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Shanghai', now()),
            updated_at TIMESTAMPTZ NULL,
            CONSTRAINT uq_community_creation_applications_slug UNIQUE(slug)
        );
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_community_creation_applications_applicant_id
        ON community_creation_applications (applicant_id);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_community_creation_applications_applicant_id;")
    op.execute("DROP TABLE IF EXISTS community_creation_applications;")

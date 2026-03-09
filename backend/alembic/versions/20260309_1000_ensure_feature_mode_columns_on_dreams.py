"""ensure feature mode columns exist on dreams

Revision ID: 20260309_1000
Revises: 20260302_1500
Create Date: 2026-03-09 10:00:00
"""

from alembic import op


revision = "20260309_1000"
down_revision = "20260302_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE dreams
        ADD COLUMN IF NOT EXISTS feature_mode VARCHAR(16) NOT NULL DEFAULT 'AUTO';
        """
    )
    op.execute(
        """
        ALTER TABLE dreams
        ADD COLUMN IF NOT EXISTS featured_reason TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE dreams
        ADD COLUMN IF NOT EXISTS featured_score_snapshot DOUBLE PRECISION;
        """
    )
    op.execute(
        """
        ALTER TABLE dreams
        ADD COLUMN IF NOT EXISTS featured_updated_by UUID;
        """
    )

    # 兼容历史数据：若之前通过 is_featured 人工精选，则统一转换为 FORCE_ON
    op.execute(
        """
        UPDATE dreams
        SET feature_mode = 'FORCE_ON'
        WHERE is_featured = TRUE
          AND (feature_mode IS NULL OR feature_mode = 'AUTO');
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE dreams DROP COLUMN IF EXISTS featured_updated_by;")
    op.execute("ALTER TABLE dreams DROP COLUMN IF EXISTS featured_score_snapshot;")
    op.execute("ALTER TABLE dreams DROP COLUMN IF EXISTS featured_reason;")
    op.execute("ALTER TABLE dreams DROP COLUMN IF EXISTS feature_mode;")

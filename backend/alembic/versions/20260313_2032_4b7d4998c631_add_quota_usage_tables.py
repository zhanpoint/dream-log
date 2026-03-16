"""add quota usage tables

Revision ID: 4b7d4998c631
Revises: 20260311_1600
Create Date: 2026-03-13 20:32:38.424762

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4b7d4998c631'
down_revision: str | None = '20260311_1600'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.create_table(
        "quota_usage_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("plan_type", sa.String(length=20), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quota_usage_logs_user_id"),
        "quota_usage_logs",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "user_quota_usage",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("dream_analysis_used", sa.Integer(), nullable=False),
        sa.Column("title_analysis_used", sa.Integer(), nullable=False),
        sa.Column("image_generation_used", sa.Integer(), nullable=False),
        sa.Column("weekly_reports_used", sa.Integer(), nullable=False),
        sa.Column("monthly_reports_used", sa.Integer(), nullable=False),
        sa.Column("yearly_reports_used", sa.Integer(), nullable=False),
        sa.Column("topic_reports_used", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "period_start", name="uq_quota_user_period"),
    )
    op.create_index(
        op.f("ix_user_quota_usage_user_id"),
        "user_quota_usage",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """降级数据库"""
    op.drop_index(op.f("ix_user_quota_usage_user_id"), table_name="user_quota_usage")
    op.drop_table("user_quota_usage")
    op.drop_index(op.f("ix_quota_usage_logs_user_id"), table_name="quota_usage_logs")
    op.drop_table("quota_usage_logs")

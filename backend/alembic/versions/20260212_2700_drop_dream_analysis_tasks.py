"""Drop dream_analysis_tasks table and analysis_task_type enum

Revision ID: 20260212_2700
Revises: 20260212_2600
Create Date: 2026-02-12 27:00:00.000000

两阶段分析不再按单任务记录，移除遗留表及关联枚举。
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260212_2700"
down_revision: Union[str, None] = "20260212_2600"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(
        op.f("ix_dream_analysis_tasks_dream_id"),
        table_name="dream_analysis_tasks",
    )
    op.drop_table("dream_analysis_tasks")
    op.execute("DROP TYPE IF EXISTS analysis_task_type CASCADE")


def downgrade() -> None:
    analysis_task_type = postgresql.ENUM(
        "STRUCTURE",
        "EMOTION",
        "SYMBOL",
        "INSIGHT",
        "TITLE_GEN",
        name="analysis_task_type",
        create_type=True,
    )
    analysis_task_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "dream_analysis_tasks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dream_id", sa.UUID(), nullable=False),
        sa.Column(
            "task_type",
            postgresql.ENUM(
                "STRUCTURE",
                "EMOTION",
                "SYMBOL",
                "INSIGHT",
                "TITLE_GEN",
                name="analysis_task_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="ai_processing_status"),
            nullable=False,
        ),
        sa.Column("ai_provider", sa.String(length=50), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=True),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dream_id"], ["dreams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dream_analysis_tasks_dream_id"),
        "dream_analysis_tasks",
        ["dream_id"],
        unique=False,
    )

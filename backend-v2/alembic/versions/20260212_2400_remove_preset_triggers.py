"""Remove preset triggers table and trigger_id

Revision ID: 20260212_2400
Revises: 20260212_2300
Create Date: 2026-02-12 24:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260212_2400"
down_revision: Union[str, None] = "20260212_2300"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE dream_triggers dt
        SET trigger_name = t.display_name
        FROM triggers t
        WHERE dt.trigger_id = t.id AND dt.trigger_name IS NULL
    """)
    op.execute("DELETE FROM dream_triggers WHERE trigger_name IS NULL")
    op.drop_constraint("check_trigger_source", "dream_triggers", type_="check")
    op.alter_column(
        "dream_triggers",
        "trigger_name",
        existing_type=sa.String(100),
        nullable=False,
    )
    op.drop_column("dream_triggers", "trigger_id")
    op.drop_table("triggers")
    op.execute("DROP TYPE IF EXISTS trigger_category")


def downgrade() -> None:
    trigger_category = postgresql.ENUM(
        "FOOD", "ACTIVITY", "EMOTION", "ENVIRONMENT", "SUBSTANCE",
        name="trigger_category",
        create_type=True,
    )
    trigger_category.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "triggers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trigger_key", sa.String(50), nullable=False),
        sa.Column("display_name", sa.String(50), nullable=False),
        sa.Column("category", postgresql.ENUM(name="trigger_category"), nullable=False),
        sa.Column("usage_count", sa.Integer(), nullable=True),
        sa.Column("nightmare_correlation", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_triggers_trigger_key", "triggers", ["trigger_key"], unique=True)
    op.add_column("dream_triggers", sa.Column("trigger_id", postgresql.UUID(), nullable=True))
    op.create_foreign_key(
        "dream_triggers_trigger_id_fkey",
        "dream_triggers",
        "triggers",
        ["trigger_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column(
        "dream_triggers",
        "trigger_name",
        existing_type=sa.String(100),
        nullable=True,
    )
    op.create_check_constraint(
        "check_trigger_source",
        "dream_triggers",
        "(trigger_id IS NOT NULL) OR (trigger_name IS NOT NULL)",
    )

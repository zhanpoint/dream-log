"""Convert triggers to freeform text

Revision ID: 20260212_2300
Revises: 20260211_2231_f97f19cf7a54
Create Date: 2026-02-12 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260212_2300"
down_revision: Union[str, None] = "f97f19cf7a54"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("dream_triggers", sa.Column("trigger_name", sa.String(100), nullable=True))
    op.add_column("dream_triggers", sa.Column("reasoning", sa.String(200), nullable=True))
    op.add_column(
        "dream_triggers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=True, server_default=sa.text("gen_random_uuid()")),
    )
    op.execute("UPDATE dream_triggers SET id = gen_random_uuid() WHERE id IS NULL")
    op.alter_column(
        "dream_triggers",
        "id",
        existing_type=postgresql.UUID(),
        nullable=False,
        server_default=None,
    )
    op.drop_constraint("dream_triggers_pkey", "dream_triggers", type_="primary")
    op.create_primary_key("dream_triggers_pkey", "dream_triggers", ["id"])
    op.alter_column(
        "dream_triggers",
        "trigger_id",
        existing_type=postgresql.UUID(),
        nullable=True,
    )
    op.create_index("idx_dream_triggers_trigger_name", "dream_triggers", ["trigger_name"])
    op.create_check_constraint(
        "check_trigger_source",
        "dream_triggers",
        "(trigger_id IS NOT NULL) OR (trigger_name IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("check_trigger_source", "dream_triggers", type_="check")
    op.drop_index("idx_dream_triggers_trigger_name", table_name="dream_triggers")
    op.drop_constraint("dream_triggers_pkey", "dream_triggers", type_="primary")
    op.drop_column("dream_triggers", "reasoning")
    op.drop_column("dream_triggers", "trigger_name")
    op.drop_column("dream_triggers", "id")
    op.alter_column(
        "dream_triggers",
        "trigger_id",
        existing_type=postgresql.UUID(),
        nullable=False,
    )
    op.create_primary_key("dream_triggers_pkey", "dream_triggers", ["dream_id", "trigger_id"])

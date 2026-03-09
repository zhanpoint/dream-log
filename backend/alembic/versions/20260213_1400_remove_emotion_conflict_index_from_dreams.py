"""Remove emotion_conflict_index from dreams table.

Revision ID: 20260213_1400
Revises: 20260212_2700
Create Date: 2026-02-13 14:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260213_1400"
down_revision: Union[str, None] = "20260212_2700"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop unused emotion_conflict_index column from dreams."""
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.drop_column("emotion_conflict_index")


def downgrade() -> None:
    """Recreate emotion_conflict_index column on dreams."""
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.add_column(sa.Column("emotion_conflict_index", sa.Float(), nullable=True))


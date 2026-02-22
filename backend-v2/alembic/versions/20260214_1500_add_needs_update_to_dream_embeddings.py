"""Add needs_update field to dream_embeddings table.

Revision ID: 20260214_1500
Revises: 20260213_1400
Create Date: 2026-02-14 15:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260214_1500"
down_revision: Union[str, None] = "20260213_1400"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add needs_update boolean field to dream_embeddings."""
    with op.batch_alter_table("dream_embeddings") as batch_op:
        batch_op.add_column(sa.Column("needs_update", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    """Remove needs_update field from dream_embeddings."""
    with op.batch_alter_table("dream_embeddings") as batch_op:
        batch_op.drop_column("needs_update")

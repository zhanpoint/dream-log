"""remove_sensory_experience_fields

Revision ID: 5e8f361d7cff
Revises: 636fe11381cf
Create Date: 2026-02-11 15:54:17.760410

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5e8f361d7cff'
down_revision: str | None = '636fe11381cf'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """移除感官体验字段（未使用的预留字段）"""
    op.drop_column('dreams', 'sensory_visual')
    op.drop_column('dreams', 'sensory_auditory')
    op.drop_column('dreams', 'sensory_tactile')
    op.drop_column('dreams', 'sensory_olfactory')
    op.drop_column('dreams', 'sensory_gustatory')
    op.drop_column('dreams', 'sensory_spatial')


def downgrade() -> None:
    """恢复感官体验字段"""
    op.add_column('dreams', sa.Column('sensory_spatial', sa.Float(), nullable=True))
    op.add_column('dreams', sa.Column('sensory_gustatory', sa.Float(), nullable=True))
    op.add_column('dreams', sa.Column('sensory_olfactory', sa.Float(), nullable=True))
    op.add_column('dreams', sa.Column('sensory_tactile', sa.Float(), nullable=True))
    op.add_column('dreams', sa.Column('sensory_auditory', sa.Float(), nullable=True))
    op.add_column('dreams', sa.Column('sensory_visual', sa.Float(), nullable=True))

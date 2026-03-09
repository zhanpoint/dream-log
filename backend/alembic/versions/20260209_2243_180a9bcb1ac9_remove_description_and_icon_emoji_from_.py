"""remove_description_and_icon_emoji_from_dream_types

Revision ID: 180a9bcb1ac9
Revises: c352eb6f8093
Create Date: 2026-02-09 22:43:28.317690

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '180a9bcb1ac9'
down_revision: str | None = 'c352eb6f8093'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库 - 删除 description 和 icon_emoji 字段"""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("dream_types")}
    if "description" in columns:
        op.drop_column("dream_types", "description")
    if "icon_emoji" in columns:
        op.drop_column("dream_types", "icon_emoji")


def downgrade() -> None:
    """降级数据库 - 恢复 description 和 icon_emoji 字段"""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("dream_types")}
    if "icon_emoji" not in columns:
        op.add_column("dream_types", sa.Column("icon_emoji", sa.String(length=10), nullable=True))
    if "description" not in columns:
        op.add_column("dream_types", sa.Column("description", sa.Text(), nullable=True))

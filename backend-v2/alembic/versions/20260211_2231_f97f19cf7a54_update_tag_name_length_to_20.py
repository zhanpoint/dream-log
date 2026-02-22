"""update_tag_name_length_to_20

Revision ID: f97f19cf7a54
Revises: 5e8f361d7cff
Create Date: 2026-02-11 22:31:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f97f19cf7a54'
down_revision: str | None = '5e8f361d7cff'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    修改 tags 表的 name 字段长度从 50 限制到 20
    限制说明：中文 2-10 个字符，英文 2-20 个字符
    """
    # 先检查并截断超过20个字符的标签名
    op.execute("""
        UPDATE tags 
        SET name = LEFT(name, 20) 
        WHERE LENGTH(name) > 20
    """)
    
    # 修改字段长度限制
    op.alter_column(
        'tags',
        'name',
        existing_type=sa.String(50),
        type_=sa.String(20),
        existing_nullable=False
    )


def downgrade() -> None:
    """
    恢复 tags 表的 name 字段长度到 50
    """
    op.alter_column(
        'tags',
        'name',
        existing_type=sa.String(20),
        type_=sa.String(50),
        existing_nullable=False
    )

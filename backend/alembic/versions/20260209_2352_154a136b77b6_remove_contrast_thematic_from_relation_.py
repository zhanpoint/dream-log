"""remove_contrast_thematic_from_relation_type

Revision ID: 154a136b77b6
Revises: 180a9bcb1ac9
Create Date: 2026-02-09 23:52:17.584484

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '154a136b77b6'
down_revision: str | None = '180a9bcb1ac9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库 - 删除 CONTRAST 和 THEMATIC 类型的关联"""
    # 1. 删除使用这两种类型的关联记录
    op.execute("""
        DELETE FROM dream_relations 
        WHERE relation_type IN ('CONTRAST', 'THEMATIC')
    """)
    
    # 2. 如果数据库中存在这些枚举值，PostgreSQL 的枚举类型无法直接修改
    # 我们需要创建新的枚举类型并迁移数据
    # 但由于我们已经删除了使用这些值的记录，可以重新创建枚举
    op.execute("ALTER TYPE relation_type RENAME TO relation_type_old")
    op.execute("CREATE TYPE relation_type AS ENUM ('SIMILAR', 'CONTINUATION')")
    op.execute("""
        ALTER TABLE dream_relations 
        ALTER COLUMN relation_type TYPE relation_type 
        USING relation_type::text::relation_type
    """)
    op.execute("DROP TYPE relation_type_old")


def downgrade() -> None:
    """降级数据库 - 恢复 CONTRAST 和 THEMATIC 类型"""
    op.execute("ALTER TYPE relation_type RENAME TO relation_type_old")
    op.execute("CREATE TYPE relation_type AS ENUM ('SIMILAR', 'CONTINUATION', 'CONTRAST', 'THEMATIC')")
    op.execute("""
        ALTER TABLE dream_relations 
        ALTER COLUMN relation_type TYPE relation_type 
        USING relation_type::text::relation_type
    """)
    op.execute("DROP TYPE relation_type_old")

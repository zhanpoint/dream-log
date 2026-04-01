"""add passkey credentials

Revision ID: 20260401_0001
Revises: 20260316_0004
Create Date: 2026-04-01 00:01:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260401_0001"
down_revision: str | None = "20260316_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """升级数据库"""
    op.create_table(
        "passkey_credentials",
        sa.Column("id", sa.String(length=512), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column("sign_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("transports", sa.dialects.postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("aaguid", sa.String(length=64), nullable=True),
        sa.Column("backup_eligible", sa.Boolean(), nullable=True),
        sa.Column("backed_up", sa.Boolean(), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('Asia/Shanghai', now())"),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "ix_passkey_credentials_user_id",
        "passkey_credentials",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """降级数据库"""
    op.drop_index("ix_passkey_credentials_user_id", table_name="passkey_credentials")
    op.drop_table("passkey_credentials")


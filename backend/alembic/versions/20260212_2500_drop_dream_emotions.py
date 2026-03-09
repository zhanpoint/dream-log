"""Drop dream_emotions table

Revision ID: 20260212_2500
Revises: 20260212_2400
Create Date: 2026-02-12 25:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260212_2500"
down_revision: Union[str, None] = "20260212_2400"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.drop_table("dream_emotions")
  op.execute("DROP TYPE IF EXISTS emotion_type_enum")


def downgrade() -> None:
  op.create_table(
    "dream_emotions",
    sa.Column("id", sa.UUID(), nullable=False),
    sa.Column("dream_id", sa.UUID(), nullable=False),
    sa.Column(
      "emotion_type",
      sa.Enum(
        "JOY",
        "SADNESS",
        "FEAR",
        "ANGER",
        "DISGUST",
        "SURPRISE",
        "TRUST",
        "ANTICIPATION",
        name="emotion_type_enum",
      ),
      nullable=False,
    ),
    sa.Column("score", sa.Float(), nullable=False),
    sa.Column(
      "source",
      sa.Enum("USER", "AI", name="emotion_source"),
      nullable=False,
    ),
    sa.Column(
      "created_at",
      sa.DateTime(timezone=True),
      server_default=sa.text("timezone('Asia/Shanghai', now())"),
      nullable=False,
    ),
    sa.ForeignKeyConstraint(["dream_id"], ["dreams.id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("id"),
    sa.UniqueConstraint("dream_id", "emotion_type", name="uq_dream_emotion_type"),
  )
  op.create_index(
    "idx_dream_emotion_type_score",
    "dream_emotions",
    ["dream_id", "emotion_type", "score"],
    unique=False,
  )
  op.create_index(
    op.f("ix_dream_emotions_dream_id"),
    "dream_emotions",
    ["dream_id"],
    unique=False,
  )
  op.create_index(
    op.f("ix_dream_emotions_emotion_type"),
    "dream_emotions",
    ["emotion_type"],
    unique=False,
  )


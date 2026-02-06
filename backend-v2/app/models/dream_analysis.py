"""
梦境分析任务模型 - dream_analysis_tasks 表
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AIProcessingStatus, AnalysisTaskType

if TYPE_CHECKING:
    from app.models.dream import Dream


class DreamAnalysisTask(Base):
    """AI 分析任务追踪表"""

    __tablename__ = "dream_analysis_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dreams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 任务类型
    task_type: Mapped[AnalysisTaskType] = mapped_column(
        Enum(AnalysisTaskType, name="analysis_task_type"), nullable=False
    )
    # 任务状态
    status: Mapped[AIProcessingStatus] = mapped_column(
        Enum(AIProcessingStatus, name="ai_processing_status", create_type=False),
        default=AIProcessingStatus.PENDING,
    )

    # AI 配置
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 结果
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 性能追踪
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("timezone('Asia/Shanghai', now())"),
    )

    # ORM 关系
    dream: Mapped[Dream] = relationship("Dream", back_populates="analysis_tasks")

    def __repr__(self) -> str:
        return f"<DreamAnalysisTask(id={self.id}, type={self.task_type}, status={self.status})>"

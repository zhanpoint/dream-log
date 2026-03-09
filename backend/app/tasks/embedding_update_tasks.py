"""
Embedding 更新异步任务
"""

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker
from app.models.dream import Dream
from app.models.dream_embedding import DreamEmbedding
from app.models.dream_insight import DreamInsight
from app.services.dream_service import _generate_embedding_for_dream

logger = logging.getLogger(__name__)


async def update_pending_embeddings(ctx: dict) -> dict:
    """
    批量更新 / 补建 embedding

    策略：
    1. 先处理「已有 embedding 且 needs_update=True」的记录（更新）
    2. 再处理「没有任何 embedding 的梦境」补建（backfill，创建时失败或历史数据）
    """
    logger.info("开始批量更新/补建 embedding")
    start_time = datetime.now()
    updated_count = 0
    created_count = 0
    failed_count = 0

    async with async_session_maker() as db:
        try:
            # ---------- 1. 需要更新的已有 embedding（needs_update=True）----------
            stmt_pending = (
                select(DreamEmbedding)
                .where(DreamEmbedding.needs_update == True)
                .limit(50)
            )
            result = await db.execute(stmt_pending)
            pending_embeddings = result.scalars().all()

            for embedding in pending_embeddings:
                try:
                    dream_stmt = (
                        select(Dream)
                        .where(Dream.id == embedding.dream_id)
                        .options(selectinload(Dream.tags), selectinload(Dream.type_mappings))
                    )
                    dream_result = await db.execute(dream_stmt)
                    dream = dream_result.scalar_one_or_none()
                    if not dream:
                        continue
                    insight_result = await db.execute(
                        select(DreamInsight).where(DreamInsight.dream_id == dream.id)
                    )
                    insight = insight_result.scalar_one_or_none()
                    await _generate_embedding_for_dream(db, dream, insight, force=True)
                    await db.commit()
                    updated_count += 1
                    logger.info(f"已更新梦境 {dream.id} 的 embedding")
                except Exception as e:
                    logger.error(f"更新梦境 {embedding.dream_id} 的 embedding 失败: {e}")
                    failed_count += 1
                    await db.rollback()

            # ---------- 2. 补建：没有任何 embedding 的梦境（有内容且未删除）----------
            subq_has_embedding = select(DreamEmbedding.dream_id)
            stmt_missing = (
                select(Dream)
                .where(Dream.deleted_at.is_(None))
                .where(Dream.id.not_in(subq_has_embedding))
                .where(Dream.content.isnot(None))
                .order_by(Dream.created_at.desc())
                .limit(50)
                .options(selectinload(Dream.tags), selectinload(Dream.type_mappings))
            )
            result_missing = await db.execute(stmt_missing)
            dreams_without_embedding = result_missing.scalars().unique().all()

            for dream in dreams_without_embedding:
                if not (dream.content and dream.content.strip()):
                    continue
                try:
                    insight_result = await db.execute(
                        select(DreamInsight).where(DreamInsight.dream_id == dream.id)
                    )
                    insight = insight_result.scalar_one_or_none()
                    await _generate_embedding_for_dream(db, dream, insight, force=False)
                    await db.commit()
                    created_count += 1
                    logger.info(f"已补建梦境 {dream.id} 的 embedding")
                except Exception as e:
                    logger.error(f"补建梦境 {dream.id} 的 embedding 失败: {e}")
                    failed_count += 1
                    await db.rollback()

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(
                f"批量 embedding 完成: 更新 {updated_count} 个，补建 {created_count} 个，失败 {failed_count} 个，耗时 {elapsed:.1f}s"
            )
            return {
                "status": "completed",
                "updated": updated_count,
                "created": created_count,
                "failed": failed_count,
                "elapsed_seconds": elapsed,
            }

        except Exception as e:
            logger.error(f"批量更新 embedding 失败: {e}")
            return {"status": "failed", "error": str(e)}

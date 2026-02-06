"""
梦境 AI 分析异步任务
"""

import logging
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dream import Dream
from app.models.dream_emotion import DreamEmotion
from app.models.dream_insight import DreamInsight
from app.models.enums import AIProcessingStatus, EmotionSource, EmotionTypeEnum
from app.models.user import shanghai_now

logger = logging.getLogger(__name__)


async def _get_db_session():
    """获取独立的数据库会话 (任务专用)"""
    from app.core.database import async_session_maker

    async with async_session_maker() as session:
        yield session


async def analyze_dream(ctx: dict, dream_id: str) -> dict:
    """
    完整梦境分析工作流

    步骤:
    1. 生成标题 (如果为空)
    2. 情绪分析 -> 写入 dream_emotions
    3. 结构化内容 + 深度洞察 -> 写入 dream_insights
    4. 更新 Dream 主表状态
    """
    from app.core.database import async_session_maker
    from app.services.ai_service import ai_service

    logger.info(f"开始分析梦境: {dream_id}")
    start_time = datetime.now()

    async with async_session_maker() as db:
        try:
            # 获取梦境
            stmt = select(Dream).where(Dream.id == uuid.UUID(dream_id))
            result = await db.execute(stmt)
            dream = result.scalar_one_or_none()

            if not dream:
                logger.error(f"梦境不存在: {dream_id}")
                return {"status": "error", "message": "梦境不存在"}

            # 更新状态为处理中
            dream.ai_processing_status = AIProcessingStatus.PROCESSING
            await db.commit()

            content = dream.content

            # ===== Step 1: 生成标题 =====
            if not dream.title:
                try:
                    title = await ai_service.generate_title(content)
                    dream.title = title
                    dream.title_generated_by_ai = True
                    dream.is_draft = False
                    logger.info(f"标题已生成: {title}")
                except Exception as e:
                    logger.warning(f"标题生成失败: {e}")

            # ===== Step 2: 情绪分析 =====
            try:
                emotion_result = await ai_service.analyze_emotions(content)
                emotions_vector = emotion_result.get("emotions_vector", {})

                # 写入情绪向量
                for emotion_name, score in emotions_vector.items():
                    emotion_name_upper = emotion_name.upper()
                    if hasattr(EmotionTypeEnum, emotion_name_upper):
                        emotion_type = EmotionTypeEnum(emotion_name)
                        # 先检查是否已存在
                        existing = await db.execute(
                            select(DreamEmotion).where(
                                DreamEmotion.dream_id == dream.id,
                                DreamEmotion.emotion_type == emotion_type,
                            )
                        )
                        if existing.scalar_one_or_none():
                            continue

                        db.add(
                            DreamEmotion(
                                dream_id=dream.id,
                                emotion_type=emotion_type,
                                score=float(score),
                                source=EmotionSource.AI,
                            )
                        )

                # 更新冲突指数
                conflict_index = emotion_result.get("conflict_index")
                if conflict_index is not None:
                    dream.emotion_conflict_index = float(conflict_index)

                # 如果用户没设置主导情绪, 用 AI 结果
                if not dream.primary_emotion:
                    ai_primary = emotion_result.get("primary_emotion_cn")
                    if ai_primary:
                        dream.primary_emotion = ai_primary

                logger.info("情绪分析完成")
            except Exception as e:
                logger.warning(f"情绪分析失败: {e}")

            # ===== Step 3: 结构化 + 深度洞察 =====
            try:
                # 获取或创建 insight
                stmt = select(DreamInsight).where(DreamInsight.dream_id == dream.id)
                result = await db.execute(stmt)
                insight = result.scalar_one_or_none()

                if not insight:
                    insight = DreamInsight(dream_id=dream.id)
                    db.add(insight)
                    await db.flush()

                # 结构化
                structured = await ai_service.analyze_structure(content)
                if structured:
                    insight.content_structured = structured

                # 深度洞察
                analysis = await ai_service.generate_insight(
                    content=content,
                    sleep_quality=dream.sleep_quality,
                    lucidity_level=dream.lucidity_level,
                    primary_emotion=dream.primary_emotion,
                    life_context=insight.life_context,
                )
                if analysis:
                    insight.ai_analysis = analysis

                logger.info("结构化和洞察分析完成")
            except Exception as e:
                logger.warning(f"洞察分析失败: {e}")

            # ===== Step 4: 更新状态 =====
            dream.ai_processed = True
            dream.ai_processing_status = AIProcessingStatus.COMPLETED
            dream.ai_processed_at = shanghai_now()

            await db.commit()

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"梦境分析完成: {dream_id}, 耗时 {elapsed:.1f}s")

            return {"status": "completed", "dream_id": dream_id, "elapsed_seconds": elapsed}

        except Exception as e:
            logger.error(f"梦境分析失败: {dream_id}, 错误: {e}")

            # 更新状态为失败
            try:
                dream.ai_processing_status = AIProcessingStatus.FAILED
                await db.commit()
            except Exception:
                await db.rollback()

            return {"status": "failed", "dream_id": dream_id, "error": str(e)}

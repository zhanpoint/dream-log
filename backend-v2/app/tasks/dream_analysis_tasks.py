"""
梦境 AI 分析异步任务
"""

import asyncio
import logging
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dream import Dream
from app.models.dream_embedding import DreamEmbedding
from app.models.dream_insight import DreamInsight
from app.models.dream_tag import DreamTag
from app.models.dream_trigger import DreamTrigger
from app.models.dream_type import DreamTypeMapping
from app.models.enums import AIProcessingStatus
from app.models.user import shanghai_now

logger = logging.getLogger(__name__)


async def _get_db_session():
    """获取独立的数据库会话 (任务专用)"""
    from app.core.database import async_session_maker

    async with async_session_maker() as session:
        yield session


def _format_dream_context(dream: Dream, insight: DreamInsight | None) -> str:
    """构建传给大模型的梦境上下文（字段全集，不含图片）
    
    将数字评分映射为有意义的文本描述，提高 AI 理解准确性
    映射文本与前端显示完全一致
    """

    def _as_text(value: object | None, default: str = "未提供") -> str:
        if value is None:
            return default
        text = str(value).strip()
        return text if text else default

    def _bool_text(value: bool | None) -> str:
        if value is None:
            return "未提供"
        return "是" if value else "否"

    # ===== 映射字典（与前端 constants.ts 完全一致）=====
    
    # 睡眠质量映射 (1-5)
    SLEEP_QUALITY_MAP = {
        1: "频繁醒来",
        2: "睡不稳",
        3: "勉强接受",
        4: "睡得好",
        5: "精神饱满",
    }
    
    # 睡眠深度映射 (1-3)
    SLEEP_DEPTH_MAP = {
        1: "浅睡",
        2: "中等",
        3: "深睡",
    }
    
    # 情绪强度映射 (1-5)
    EMOTION_INTENSITY_MAP = {
        1: "很弱",
        2: "轻微",
        3: "明显",
        4: "强烈",
        5: "非常强",
    }
    
    # 清醒程度映射 (1-5)
    LUCIDITY_MAP = {
        1: "完全无意识",
        2: "有朦胧意识",
        3: "偶尔察觉",
        4: "经常知道",
        5: "完全清醒控制",
    }
    
    # 清晰度映射 (1-5)
    VIVIDNESS_MAP = {
        1: "模糊",
        2: "一般",
        3: "清晰",
        4: "非常清晰",
        5: "如同现实",
    }
    
    # 记忆完整度映射 (1-5，前端使用 1-5 的 value)
    COMPLETENESS_MAP = {
        1: "碎片",
        2: "片段",
        3: "部分完整",
        4: "基本完整",
        5: "完整叙事",
    }
    
    def _completeness_text(score: int | None) -> str:
        if score is None:
            return "未提供"
        return COMPLETENESS_MAP.get(score, f"未知({score})")
    
    # 现实关联度映射 (1-4)
    REALITY_CORRELATION_MAP = {
        1: "几乎无关",
        2: "可能有关",
        3: "明显相关",
        4: "高度相关",
    }
    
    # 醒来方式映射
    AWAKENING_STATE_MAP = {
        "NATURAL": "自然醒来",
        "ALARM": "闹钟唤醒",
        "STARTLED": "受惊醒来",
        "GRADUAL": "逐渐清醒",
    }
    
    # 梦境类型映射
    DREAM_TYPE_MAP = {
        "NORMAL": "普通梦",
        "LUCID": "清醒梦",
        "NIGHTMARE": "噩梦",
        "RECURRING": "重复梦",
        "SYMBOLIC": "象征性强",
        "VIVID": "特别清晰",
    }

    # ===== 提取和映射数据 =====
    
    # 梦境类型
    dream_types = [
        DREAM_TYPE_MAP.get(m.dream_type.type_name.value, m.dream_type.type_name.value)
        for m in (dream.type_mappings or [])
        if getattr(m, "dream_type", None)
    ]
    
    # 标签
    tags = [
        m.tag.name
        for m in (dream.tags or [])
        if getattr(m, "tag", None) and getattr(m.tag, "name", None)
    ]
    
    # 映射数字为文本
    sleep_quality_text = SLEEP_QUALITY_MAP.get(dream.sleep_quality) if dream.sleep_quality else "未提供"
    sleep_depth_text = SLEEP_DEPTH_MAP.get(dream.sleep_depth) if dream.sleep_depth else "未提供"
    emotion_intensity_text = EMOTION_INTENSITY_MAP.get(dream.emotion_intensity) if dream.emotion_intensity else "未提供"
    lucidity_text = LUCIDITY_MAP.get(dream.lucidity_level) if dream.lucidity_level else "未提供"
    vividness_text = VIVIDNESS_MAP.get(dream.vividness_level) if dream.vividness_level else "未提供"
    completeness_text = _completeness_text(dream.completeness_score)
    reality_correlation_text = REALITY_CORRELATION_MAP.get(dream.reality_correlation) if dream.reality_correlation else "未提供"
    awakening_state_text = AWAKENING_STATE_MAP.get(dream.awakening_state.value) if dream.awakening_state else "未提供"

    reflection_block = ""
    if insight and insight.reflection_answers:
        try:
            pairs = [
                f"- 问题: {item.get('question', '')} | 回答: {item.get('answer', '')}"
                for item in insight.reflection_answers
                if isinstance(item, dict)
            ]
            if pairs:
                reflection_block = "\n自我反思记录:\n" + "\n".join(pairs)
        except Exception:
            reflection_block = ""

    base = (
        f"标题: {_as_text(dream.title)}\n"
        f"梦境日期: {_as_text(dream.dream_date)}\n"
        f"梦境时间: {_as_text(dream.dream_time)}\n"
        f"内容: {_as_text(dream.content)}\n"
        f"是否午睡: {_bool_text(dream.is_nap)}\n"
        f"入睡时间: {_as_text(dream.sleep_start_time)}\n"
        f"醒来时间: {_as_text(dream.awakening_time)}\n"
        f"睡眠时长(分钟): {_as_text(dream.sleep_duration_minutes)}\n"
        f"醒来方式: {awakening_state_text}\n"
        f"睡眠质量: {sleep_quality_text}\n"
        f"睡眠深度: {sleep_depth_text}\n"
        f"睡眠碎片化: {_bool_text(dream.sleep_fragmented)}\n"
        f"主导情绪: {_as_text(dream.primary_emotion)}\n"
        f"情绪强度: {emotion_intensity_text}\n"
        f"醒后情绪残留: {_bool_text(dream.emotion_residual)}\n"
        f"梦境类型: {', '.join(dream_types) if dream_types else '未提供'}\n"
        f"清醒程度: {lucidity_text}\n"
        f"清晰度: {vividness_text}\n"
        f"记忆完整度: {completeness_text}\n"
        f"前一天事件: {_as_text(insight.life_context if insight else None)}\n"
        f"现实关联度: {reality_correlation_text}\n"
        f"个人理解: {_as_text(insight.user_interpretation if insight else None)}\n"
        f"标签: {', '.join(tags) if tags else '未提供'}"
    )
    if reflection_block:
        base += reflection_block
    return base


async def analyze_dream(ctx: dict, dream_id: str, accept_language: str | None = None) -> dict:
    """
    完整梦境分析工作流（两阶段）

    阶段1（并行）：标题 + 基础分析（snapshot / 情绪 / 触发因素 / 睡眠）-> dream_insights.content_structured、ai_analysis 部分字段，dream_triggers
    阶段2（串行）：深度洞察 -> dream_insights.ai_analysis 其余字段
    相似梦境发现 -> dream_relations
    更新 Dream 主表状态
    """
    from app.core.database import async_session_maker
    from app.services.ai_service import ai_service, get_target_language_from_locale

    logger.info(f"开始分析梦境: {dream_id}")
    start_time = datetime.now()

    async with async_session_maker() as db:
        try:
            # 获取梦境
            stmt = (
                select(Dream)
                .where(Dream.id == uuid.UUID(dream_id))
                .options(
                    selectinload(Dream.tags).selectinload(DreamTag.tag),
                    selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),
                )
            )
            result = await db.execute(stmt)
            dream = result.scalar_one_or_none()

            if not dream:
                logger.error(f"梦境不存在: {dream_id}")
                return {"status": "error", "message": "梦境不存在"}

            # 更新状态为处理中
            dream.ai_processing_status = AIProcessingStatus.PROCESSING
            await db.commit()

            target_language = get_target_language_from_locale(accept_language)

            # 发送 SSE 事件：分析开始（通过 Redis 推送到 API 进程再转发给前端）
            try:
                from app.core.sse_manager import publish_sse_event

                redis_pub = ctx.get("redis_pub")
                if redis_pub:
                    await publish_sse_event(
                        redis_pub,
                        dream.user_id,
                        "dream_analysis_status",
                        {
                            "dream_id": str(dream.id),
                            "status": "PROCESSING",
                            "message": "AI 分析已开始",
                        },
                    )
            except Exception as e:
                logger.warning(f"发送 SSE 事件失败: {e}")

            content = dream.content
            insight_stmt = select(DreamInsight).where(DreamInsight.dream_id == dream.id)
            insight_result = await db.execute(insight_stmt)
            insight = insight_result.scalar_one_or_none()
            if not insight:
                insight = DreamInsight(dream_id=dream.id)
                db.add(insight)
                await db.flush()
            dream_context = _format_dream_context(dream, insight)

            # ===== 两阶段分析：阶段1 并行 → 阶段2 串行（依赖阶段1）=====
            async def _noop():
                return None

            is_first_analysis = not dream.ai_processed
            need_title = is_first_analysis and not dream.title

            # 阶段1（并行）：标题 + 基础分析（合并 structure + emotion + trigger + sleep）
            phase1_results = await asyncio.gather(
                ai_service.generate_title(content, target_language=target_language) if need_title else _noop(),
                ai_service.analyze_basic(dream_context, target_language=target_language),
                return_exceptions=True,
            )
            title_result, basic_result = phase1_results

            # 标题
            if need_title and not isinstance(title_result, BaseException) and title_result:
                dream.title = title_result
                dream.title_generated_by_ai = True
                dream.is_draft = False
                logger.info(f"标题已生成: {title_result}")
            elif need_title and isinstance(title_result, BaseException):
                logger.warning(f"标题生成失败: {title_result}")

            # 阶段1 结果：若失败则用空 dict，阶段2 仍可生成洞察（无阶段1参考）
            basic_analysis = basic_result if not isinstance(basic_result, BaseException) and basic_result else {}
            if isinstance(basic_result, BaseException):
                logger.warning(f"阶段1基础分析失败: {basic_result}")

            # 从阶段1 写入：snapshot、情绪、触发因素、睡眠
            new_triggers_to_add = []
            if basic_analysis:
                merged_ai = insight.ai_analysis or {}
                if basic_analysis.get("snapshot"):
                    insight.content_structured = {"snapshot": basic_analysis["snapshot"]}
                if basic_analysis.get("emotional_summary"):
                    merged_ai["emotional_summary"] = basic_analysis["emotional_summary"]
                if basic_analysis.get("emotion_interpretation"):
                    merged_ai["emotion_interpretation"] = basic_analysis["emotion_interpretation"]
                for trigger_data in basic_analysis.get("triggers") or []:
                    new_triggers_to_add.append(
                        DreamTrigger(
                            dream_id=dream.id,
                            trigger_name=trigger_data.get("name", ""),
                            reasoning=trigger_data.get("reasoning"),
                            confidence=trigger_data.get("confidence", 3),
                        )
                    )
                sleep_analysis_text = basic_analysis.get("sleep_analysis_text")
                sleep_suggestions = basic_analysis.get("sleep_suggestions") or []
                if sleep_analysis_text or sleep_suggestions:
                    merged_ai["sleep_analysis"] = {
                        "analysis_text": sleep_analysis_text or "",
                        "suggestions": sleep_suggestions,
                    }
                insight.ai_analysis = merged_ai
                logger.info("阶段1基础分析完成（概括/情绪/触发/睡眠）")

            # 阶段2（串行）：深度洞察（依赖阶段1结果）
            try:
                insight_analysis_result = await ai_service.generate_insight(
                    dream_context,
                    basic_analysis,
                    target_language=target_language,
                )
            except Exception as e:
                logger.warning(f"阶段2深度洞察失败: {e}")
                insight_analysis_result = None
            if insight_analysis_result:
                # 后端不再使用 themes 字段，避免存入无实际价值的信息
                insight_analysis_result.pop("themes", None)
                merged_ai = insight.ai_analysis or {}
                merged_ai.update(insight_analysis_result)
                insight.ai_analysis = merged_ai
                logger.info("阶段2深度洞察完成")

            # ===== 先写入新数据，再删除旧数据（在同一个事务中，确保原子性）=====
            try:
                # 1. 处理触发因素（阶段1 有结果即用其 triggers 替换旧数据）
                if basic_analysis:
                    if new_triggers_to_add:
                        for new_trigger in new_triggers_to_add:
                            db.add(new_trigger)
                    old_triggers_stmt = select(DreamTrigger).where(DreamTrigger.dream_id == dream.id)
                    old_triggers_result = await db.execute(old_triggers_stmt)
                    for old_trigger in old_triggers_result.scalars().all():
                        await db.delete(old_trigger)
                    if not new_triggers_to_add:
                        logger.info("未识别到触发因素，已清空旧的触发因素")
            except Exception as e:
                logger.warning(f"数据更新失败: {e}")

            # ===== Step 5: 相似梦境发现 =====
            # 注意：embedding 已在创建梦境时生成，这里直接使用已有的 embedding
            similar_dreams = []
            try:
                from app.services.similarity_service import (
                    create_similar_dream_relations,
                    find_similar_dreams,
                )
                
                # 查找相似梦境（动态阈值，最多 5 个）
                similar_dreams = await find_similar_dreams(
                    db=db,
                    dream_id=dream.id,
                    user_id=dream.user_id,
                    limit=5,
                    threshold=None,  # 自动根据用户梦境数量调整
                )
                
                if similar_dreams:
                    # 创建关联记录
                    count = await create_similar_dream_relations(
                        db=db,
                        source_dream_id=dream.id,
                        similar_dreams=similar_dreams,
                    )
                    logger.info(f"相似梦境发现完成，创建了 {count} 个关联")
                else:
                    logger.info("未发现相似梦境")
            except Exception as e:
                logger.warning(f"相似梦境发现失败: {e}")

            # ===== Step 6: 更新状态 =====
            dream.ai_processed = True
            dream.ai_processing_status = AIProcessingStatus.COMPLETED
            dream.ai_processed_at = shanghai_now()

            await db.commit()

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"梦境分析完成: {dream_id}, 耗时 {elapsed:.1f}s")

            # 发送 SSE 事件：分析完成（通过 Redis 推送到 API 进程再转发给前端）
            try:
                from app.core.sse_manager import publish_sse_event

                redis_pub = ctx.get("redis_pub")
                if redis_pub:
                    # 将相似梦境信息附带到 COMPLETED 事件中，避免前端额外请求
                    similar_dreams_data = [
                        {
                            "id": str(sd.id),
                            "title": sd.title,
                            "dream_date": str(sd.dream_date),
                            "content_preview": (sd.content or "")[:80],
                        }
                        for sd, _ in similar_dreams
                    ] if similar_dreams else []
                    await publish_sse_event(
                        redis_pub,
                        dream.user_id,
                        "dream_analysis_status",
                        {
                            "dream_id": str(dream.id),
                            "status": "COMPLETED",
                            "message": "AI 分析已完成",
                            "elapsed_seconds": elapsed,
                            "similar_dreams": similar_dreams_data,
                        },
                    )
            except Exception as e:
                logger.warning(f"发送 SSE 事件失败: {e}")

            return {"status": "completed", "dream_id": dream_id, "elapsed_seconds": elapsed}

        except Exception as e:
            logger.error(f"梦境分析失败: {dream_id}, 错误: {e}")

            # 更新状态为失败
            try:
                dream.ai_processing_status = AIProcessingStatus.FAILED
                await db.commit()

                # 发送 SSE 事件：分析失败（通过 Redis 推送到 API 进程再转发给前端）
                try:
                    from app.core.sse_manager import publish_sse_event

                    redis_pub = ctx.get("redis_pub")
                    if redis_pub:
                        await publish_sse_event(
                            redis_pub,
                            dream.user_id,
                            "dream_analysis_status",
                            {
                                "dream_id": str(dream.id),
                                "status": "FAILED",
                                "message": f"AI 分析失败: {str(e)}",
                            },
                        )
                except Exception as sse_error:
                    logger.warning(f"发送 SSE 事件失败: {sse_error}")
            except Exception:
                await db.rollback()

            return {"status": "failed", "dream_id": dream_id, "error": str(e)}


async def update_inspiration_scores() -> dict:
    """
    定期后台任务：重算所有公开梦境的灵感分，并自动标记高分梦境为精选。
    调用方式：直接 await，或由 APScheduler/Celery beat 定期触发。
    """
    from app.core.database import async_session_maker
    from app.models.enums import PrivacyLevel
    from sqlalchemy import update as sa_update

    processed = 0
    featured_new = 0

    async with async_session_maker() as db:
        try:
            stmt = select(Dream).where(
                Dream.privacy_level == PrivacyLevel.PUBLIC,
                Dream.deleted_at.is_(None),
            )
            dreams = (await db.execute(stmt)).scalars().all()

            for dream in dreams:
                score = (
                    dream.resonance_count * 2.0
                    + dream.comment_count * 1.5
                    + dream.interpretation_count * 3.0
                )
                # 高分阈值自动精选（>= 30 分）
                should_feature = score >= 30.0
                if should_feature and not dream.is_featured:
                    featured_new += 1
                await db.execute(
                    sa_update(Dream)
                    .where(Dream.id == dream.id)
                    .values(inspiration_score=score, is_featured=should_feature if should_feature else dream.is_featured)
                )
                processed += 1

            await db.commit()
            logger.info(f"灵感分更新完成: 处理 {processed} 条，新精选 {featured_new} 条")
            return {"processed": processed, "featured_new": featured_new}
        except Exception as e:
            logger.error(f"灵感分更新失败: {e}")
            await db.rollback()
            return {"error": str(e)}

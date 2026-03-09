"""
热度分计算服务：基础分、时间衰减、质量加成。
供 Feed/搜索「最热」排序与单梦实时更新使用。
"""

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dream import Dream
from app.models.enums import PrivacyLevel

# 权重（与设计一致）
WEIGHT_RESONANCE = 3
WEIGHT_COMMENT = 5
WEIGHT_INTERPRETATION = 10
WEIGHT_ADOPTED_EXTRA = 5  # 采纳解读在 10 基础上 +5 = 15
WEIGHT_BOOKMARK = 4
WEIGHT_VIEW_PER_10 = 1

# 时间衰减： (最大天数, 系数)
TIME_DECAY_BANDS = [
    (1, 1.0),
    (2, 0.85),
    (3, 0.70),
    (7, 0.50),
    (14, 0.30),
    (30, 0.15),
]
DECAY_AFTER_30 = 0.05

# 质量加成
QUALITY_FEATURED = 1.3
QUALITY_SEEKING = 1.1


def _time_decay_factor(created_at: datetime) -> float:
    """根据 created_at 与当前时间差返回时间衰减系数。"""
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = now - created_at
    days = delta.total_seconds() / 86400
    for max_days, factor in TIME_DECAY_BANDS:
        if days <= max_days:
            return factor
    return DECAY_AFTER_30


def compute_base_score(dream: Dream) -> float:
    """基础分：共鸣×3 + 评论×5 + 解读×10 + 采纳×5 + 收藏×4 + floor(浏览/10)×1。"""
    interp = getattr(dream, "interpretation_count", 0) or 0
    adopted = getattr(dream, "adopted_interpretation_count", 0) or 0
    base = (
        (getattr(dream, "resonance_count", 0) or 0) * WEIGHT_RESONANCE
        + (getattr(dream, "comment_count", 0) or 0) * WEIGHT_COMMENT
        + interp * WEIGHT_INTERPRETATION
        + adopted * WEIGHT_ADOPTED_EXTRA
        + (getattr(dream, "bookmark_count", 0) or 0) * WEIGHT_BOOKMARK
        + ((getattr(dream, "view_count", 0) or 0) // 10) * WEIGHT_VIEW_PER_10
    )
    return float(base)


def compute_quality_multiplier(dream: Dream) -> float:
    """质量加成：精选×1.3，求解读×1.1，可叠加。"""
    m = 1.0
    if getattr(dream, "is_featured", False):
        m *= QUALITY_FEATURED
    if getattr(dream, "is_seeking_interpretation", False):
        m *= QUALITY_SEEKING
    return m


def compute_heat_score(dream: Dream) -> float:
    """
    计算广场/社群用热度分：基础分 × 时间衰减 × 质量加成。
    作者加成不实现，仅在文档预留。
    """
    base = compute_base_score(dream)
    decay = _time_decay_factor(dream.created_at)
    quality = compute_quality_multiplier(dream)
    return base * decay * quality


async def recalculate_dream_heat(db: AsyncSession, dream_id) -> None:
    """从 DB 取出梦境，重算 heat_score 并写回。"""
    dream = await db.get(Dream, dream_id)
    if not dream:
        return
    score = compute_heat_score(dream)
    await db.execute(update(Dream).where(Dream.id == dream_id).values(heat_score=score))


async def backfill_heat_scores(db: AsyncSession, batch_size: int = 500) -> int:
    """
    全量回填公开梦境的 heat_score（迁移后或定时任务调用）。
    返回更新条数。
    """
    stmt = (
        select(Dream)
        .where(Dream.privacy_level == PrivacyLevel.PUBLIC, Dream.deleted_at.is_(None))
        .limit(batch_size)
    )
    result = await db.execute(stmt)
    dreams = result.scalars().all()
    count = 0
    for dream in dreams:
        score = compute_heat_score(dream)
        await db.execute(update(Dream).where(Dream.id == dream.id).values(heat_score=score))
        count += 1
    return count

"""
向量相似度搜索服务
"""

import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dream import Dream
from app.models.dream_embedding import DreamEmbedding
from app.models.dream_relation import DreamRelation
from app.models.enums import EmotionSource, RelationType

logger = logging.getLogger(__name__)


def get_similarity_threshold(user_dream_count: int) -> float:
    """
    根据用户梦境数量动态调整阈值
    
    Args:
        user_dream_count: 用户梦境总数
    
    Returns:
        相似度阈值 (0-1)
    """
    if user_dream_count < 10:
        return 0.70  # 梦境少，降低阈值增加推荐
    elif user_dream_count < 50:
        return 0.75  # 标准阈值
    else:
        return 0.80  # 梦境多，提高阈值保证质量


def calculate_time_decay_weight(dream_date: datetime, current_date: datetime | None = None) -> float:
    """
    计算时间衰减权重
    
    Args:
        dream_date: 梦境日期
        current_date: 当前日期（默认为今天）
    
    Returns:
        权重 (0.5-1.0)
    """
    if current_date is None:
        from app.models.user import shanghai_now
        current_date = shanghai_now()
    
    days_diff = (current_date - dream_date).days
    
    if days_diff <= 30:
        return 1.0  # 30 天内：不衰减
    elif days_diff <= 90:
        # 30-90 天：线性衰减到 0.8
        return 1.0 - (days_diff - 30) / 60 * 0.2
    else:
        # 90+ 天：衰减到 0.5
        return max(0.5, 0.8 - (days_diff - 90) / 180 * 0.3)


async def find_similar_dreams(
    db: AsyncSession,
    dream_id: uuid.UUID,
    user_id: uuid.UUID,
    limit: int = 5,
    threshold: float | None = None,
) -> list[tuple[Dream, float]]:
    """
    基于向量相似度查找相似梦境（带时间衰减）
    
    Args:
        db: 数据库会话
        dream_id: 当前梦境 ID
        user_id: 用户 ID
        limit: 返回数量
        threshold: 相似度阈值（None 则自动根据用户梦境数量调整）
    
    Returns:
        [(Dream, weighted_similarity_score), ...] 按加权相似度降序
    """
    # 1. 获取当前梦境的 embedding 和日期
    stmt = select(Dream, DreamEmbedding).join(
        DreamEmbedding, Dream.id == DreamEmbedding.dream_id
    ).where(Dream.id == dream_id)
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        logger.info(f"梦境 {dream_id} 没有 embedding 记录，跳过相似度搜索")
        return []
    current_dream, current_embedding = row
    vec = current_embedding.content_embedding
    # 不用 if not vec：embedding 是向量，直接做布尔判断会触发 "ambiguous truth value"
    if vec is None or (hasattr(vec, "__len__") and len(vec) == 0):
        logger.info(f"梦境 {dream_id} embedding 为空，跳过相似度搜索")
        return []
    target_embedding_str = "[" + ",".join(str(float(x)) for x in vec) + "]"
    
    # 2. 动态调整阈值
    if threshold is None:
        # 统计用户梦境数量
        count_stmt = select(func.count()).select_from(Dream).where(
            Dream.user_id == user_id,
            Dream.deleted_at.is_(None),
        )
        dream_count = (await db.execute(count_stmt)).scalar() or 0
        threshold = get_similarity_threshold(dream_count)
        logger.info(f"用户有 {dream_count} 个梦境，使用阈值 {threshold}")
    
    # 3. 使用 pgvector 的余弦相似度搜索（传入 vector 字符串以便 PostgreSQL 正确解析）
    query = text("""
        SELECT 
            d.id,
            d.title,
            d.content,
            d.dream_date,
            d.primary_emotion,
            d.vividness_level,
            d.recorded_at,
            (1 - (e.content_embedding <=> CAST(:target_embedding AS vector))) as similarity
        FROM dreams d
        JOIN dream_embeddings e ON e.dream_id = d.id
        WHERE d.user_id = :user_id
          AND d.id != :dream_id
          AND d.deleted_at IS NULL
          AND e.content_embedding IS NOT NULL
          AND (1 - (e.content_embedding <=> CAST(:target_embedding AS vector))) >= :threshold
        ORDER BY similarity DESC
        LIMIT :limit_multiplier
    """)
    
    # 多拉取一些候选，因为加权后可能排序变化
    result = await db.execute(
        query,
        {
            "target_embedding": target_embedding_str,
            "user_id": user_id,
            "dream_id": dream_id,
            "threshold": threshold,
            "limit_multiplier": limit * 2,
        },
    )
    
    rows = result.fetchall()
    
    if not rows:
        logger.info(f"未找到相似度 >= {threshold} 的梦境")
        return []
    
    # 4. 应用时间衰减权重
    weighted_results = []
    for row in rows:
        dream_id_str = str(row[0])
        recorded_at = row[6]
        raw_similarity = float(row[7])
        
        # 计算时间衰减权重
        time_weight = calculate_time_decay_weight(recorded_at, current_dream.recorded_at)
        weighted_similarity = raw_similarity * time_weight
        
        # 获取完整的 Dream 对象
        dream_stmt = select(Dream).where(Dream.id == uuid.UUID(dream_id_str))
        dream_result = await db.execute(dream_stmt)
        dream = dream_result.scalar_one_or_none()
        
        if dream:
            weighted_results.append((dream, weighted_similarity))
    
    # 5. 按加权相似度重新排序并取 top N
    weighted_results.sort(key=lambda x: x[1], reverse=True)
    final_results = weighted_results[:limit]
    
    logger.info(f"找到 {len(final_results)} 个相似梦境（时间衰减加权后）")
    return final_results


async def create_similar_dream_relations(
    db: AsyncSession,
    source_dream_id: uuid.UUID,
    similar_dreams: list[tuple[Dream, float]],
) -> int:
    """
    创建相似梦境关联记录
    
    Args:
        db: 数据库会话
        source_dream_id: 源梦境 ID
        similar_dreams: [(Dream, weighted_similarity_score), ...]
    
    Returns:
        创建的关联数量
    """
    created_count = 0
    
    for dream, similarity_score in similar_dreams:
        # 检查是否已存在
        stmt = select(DreamRelation).where(
            DreamRelation.source_dream_id == source_dream_id,
            DreamRelation.target_dream_id == dream.id,
            DreamRelation.relation_type == RelationType.SIMILAR,
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            # 更新相似度
            existing.similarity_score = similarity_score
        else:
            # 创建新关联
            relation = DreamRelation(
                source_dream_id=source_dream_id,
                target_dream_id=dream.id,
                relation_type=RelationType.SIMILAR,
                similarity_score=similarity_score,
                created_by=EmotionSource.AI,
            )
            db.add(relation)
            created_count += 1
    
    await db.commit()
    logger.info(f"创建了 {created_count} 个相似梦境关联")
    return created_count

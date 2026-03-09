"""
热门推荐服务：热门搜索词、热门梦境、热门标签、推荐用户
- 所有结果通过 Redis 缓存，按 TTL 自动过期后首次请求重算（懒计算）
"""

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from redis.asyncio import Redis
from sqlalchemy import select, text as sa_text, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_history import SearchHistory
from app.models.user import User
from app.models.community import Comment, UserFollow
from app.models.dream import Dream
from app.schemas.community import (
    CommunityMetrics,
    DreamCardSocial,
    RecommendedUser,
    RisingInterpreter,
    TrendingKeyword,
    TrendingResponse,
    TrendingTag,
    UserPublicBrief,
)

logger = logging.getLogger(__name__)

# ── Redis 缓存 Key & TTL ──────────────────────────────────────────────────────
_KEY_KEYWORDS = "trending:keywords"
_KEY_DREAMS = "trending:dreams"
_KEY_TAGS = "trending:tags:{user_id}"
_KEY_USERS = "trending:users:{user_id}"
_KEY_RISING_USERS = "trending:rising-users"

_TTL_KEYWORDS = 3600       # 1 小时
_TTL_DREAMS = 1800         # 30 分钟
_TTL_TAGS = 7200           # 2 小时
_TTL_USERS = 3600          # 1 小时
_TTL_RISING_USERS = 3600   # 1 小时


class TrendingService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    # ── 公共入口 ──────────────────────────────────────────────────────────────

    async def get_trending(
        self,
        current_user_id: uuid.UUID | None = None,
    ) -> TrendingResponse:
        """获取热门推荐汇总（各子查询独立 savepoint，单个失败不影响其他）"""
        keywords = await self._get_keywords()
        dreams = await self._get_hot_dreams()
        tags = await self._get_tags(current_user_id)
        users = await self._get_recommended_users(current_user_id)
        rising_users = await self._get_rising_users()
        metrics = await self._get_community_metrics()
        return TrendingResponse(
            keywords=keywords,
            dreams=dreams,
            tags=tags,
            users=users,
            rising_users=rising_users,
            metrics=metrics,
            updated_at=datetime.now(timezone.utc),
        )

    async def get_search_suggestions(
        self, query: str, limit: int = 6
    ) -> list[str]:
        """搜索建议：query 为空时返回热门词，有内容时返回前缀匹配"""
        if not query.strip():
            keywords = await self._get_keywords()
            return [k.keyword for k in keywords[:limit]]

        # 有输入时：从热词中前缀/包含匹配 + 从情绪标签中模糊匹配
        keywords = await self._get_keywords()
        matched = [
            k.keyword for k in keywords
            if query.lower() in k.keyword.lower()
        ][:limit]
        return matched

    # ── 热门搜索词 ────────────────────────────────────────────────────────────

    async def _get_keywords(self) -> list[TrendingKeyword]:
        cached = await self.redis.get(_KEY_KEYWORDS)
        if cached:
            return [TrendingKeyword(**item) for item in json.loads(cached)]

        result = await self._run_in_savepoint(self._compute_keywords(), [])
        if result:
            await self.redis.setex(_KEY_KEYWORDS, _TTL_KEYWORDS, json.dumps([k.model_dump() for k in result]))
        return result

    async def _compute_keywords(self, limit: int = 6) -> list[TrendingKeyword]:
        """
        热度分 = 搜索次数 × 时间衰减 × 结果质量系数
        时间衰减：今天1.0 / 昨天0.7 / 3天前0.5 / 7天前0.3
        结果质量：有结果1.0 / 无结果0.3
        """
        stmt = sa_text("""
            SELECT
                query,
                SUM(
                    CASE
                        WHEN created_at > NOW() - INTERVAL '1 day'  THEN 1.0
                        WHEN created_at > NOW() - INTERVAL '2 days' THEN 0.7
                        WHEN created_at > NOW() - INTERVAL '3 days' THEN 0.5
                        ELSE 0.3
                    END
                    *
                    CASE WHEN result_count > 0 THEN 1.0 ELSE 0.3 END
                ) AS score,
                COUNT(*) AS total
            FROM search_history
            WHERE created_at > NOW() - INTERVAL '7 days'
              AND LENGTH(query) >= 2
            GROUP BY query
            HAVING COUNT(*) >= 2
            ORDER BY score DESC
            LIMIT :limit
        """)
        rows = (await self.db.execute(stmt, {"limit": limit})).all()
        return [TrendingKeyword(keyword=r.query, score=round(float(r.score), 2)) for r in rows]

    # ── 热门梦境 ──────────────────────────────────────────────────────────────

    async def _get_hot_dreams(self) -> list[DreamCardSocial]:
        cached = await self.redis.get(_KEY_DREAMS)
        if cached:
            data = json.loads(cached)
            return [DreamCardSocial(**item) for item in data]

        result = await self._run_in_savepoint(self._compute_hot_dreams(), [])
        if result:
            payload = [d.model_dump(mode="json") for d in result]
            await self.redis.setex(_KEY_DREAMS, _TTL_DREAMS, json.dumps(payload))
        return result

    async def _compute_hot_dreams(self, limit: int = 6) -> list[DreamCardSocial]:
        """
        灵感分 = 共鸣数×2 + 评论数×1.5 + 解读数×3
        综合分 = 灵感分 × 时间衰减 × 质量系数
        仅取3天内公开、非匿名、非草稿梦境
        """
        stmt = sa_text("""
            SELECT
                id, title, content, dream_date, primary_emotion,
                emotion_tags, is_seeking_interpretation, is_anonymous,
                resonance_count, comment_count, interpretation_count, view_count,
                is_featured, user_id, created_at,
                (
                    (resonance_count * 2.0 + comment_count * 1.5 + interpretation_count * 3.0)
                    * CASE
                        WHEN created_at > NOW() - INTERVAL '1 day' THEN 1.0
                        WHEN created_at > NOW() - INTERVAL '2 days' THEN 0.8
                        ELSE 0.6
                      END
                    * CASE
                        WHEN is_featured THEN 1.5
                        WHEN is_seeking_interpretation THEN 1.3
                        WHEN COALESCE(jsonb_array_length(emotion_tags), 0) > 0 THEN 1.2
                        WHEN COALESCE(LENGTH(title), 0) > 5 THEN 1.0
                        ELSE 0.8
                      END
                ) AS hot_score
            FROM dreams
            WHERE privacy_level = 'PUBLIC'
              AND is_anonymous = FALSE
              AND is_draft = FALSE
              AND deleted_at IS NULL
              AND created_at > NOW() - INTERVAL '3 days'
            ORDER BY hot_score DESC
            LIMIT :limit
        """)
        rows = (await self.db.execute(stmt, {"limit": limit})).all()
        if not rows:
            return []

        # 批量查作者
        user_ids = list({r.user_id for r in rows})
        users_result = await self.db.execute(select(User).where(User.id.in_(user_ids)))
        author_map: dict[uuid.UUID, User] = {u.id: u for u in users_result.scalars()}

        items = []
        for r in rows:
            author = author_map.get(r.user_id)
            author_brief = None
            if author:
                author_brief = UserPublicBrief(
                    id=author.id,
                    username=author.username,
                    avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            items.append(DreamCardSocial(
                id=r.id,
                title=r.title,
                content_preview=(r.content or "")[:150],
                dream_date=str(r.dream_date),
                dream_types=[],
                is_seeking_interpretation=r.is_seeking_interpretation,
                is_anonymous=False,
                resonance_count=r.resonance_count,
                comment_count=r.comment_count,
                interpretation_count=r.interpretation_count,
                view_count=getattr(r, "view_count", 0),
                bookmark_count=getattr(r, "bookmark_count", 0),
                share_count=getattr(r, "share_count", 0),
                has_resonated=False,
                has_bookmarked=False,
                author=author_brief,
                created_at=r.created_at,
                is_featured=r.is_featured,
                inspiration_score=round(float(r.hot_score), 1),
            ))
        return items

    # ── 热门标签 ──────────────────────────────────────────────────────────────

    async def _get_tags(self, current_user_id: uuid.UUID | None) -> list[TrendingTag]:
        cache_key = _KEY_TAGS.format(user_id=str(current_user_id) if current_user_id else "anon")
        cached = await self.redis.get(cache_key)
        if cached:
            return [TrendingTag(**item) for item in json.loads(cached)]

        result = await self._run_in_savepoint(self._compute_tags(current_user_id=current_user_id), [])
        if result:
            await self.redis.setex(cache_key, _TTL_TAGS, json.dumps([t.model_dump() for t in result]))
        return result

    async def _compute_tags(
        self,
        current_user_id: uuid.UUID | None,
        limit: int = 8,
    ) -> list[TrendingTag]:
        """近24小时热门标签：全站热度 × 用户兴趣（登录用户个性化混排）"""
        stmt = sa_text("""
            SELECT t.name AS tag, COUNT(*) AS cnt
            FROM dream_tags dt
            JOIN tags t ON t.id = dt.tag_id
            JOIN dreams d ON d.id = dt.dream_id
            WHERE d.privacy_level = 'PUBLIC'
              AND d.is_draft = FALSE
              AND d.deleted_at IS NULL
              AND d.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY t.name
            HAVING COUNT(*) >= 2
            ORDER BY cnt DESC
            LIMIT :limit
        """)
        rows = (await self.db.execute(stmt, {"limit": max(limit * 8, 32)})).all()

        raw_candidates: list[tuple[str, int]] = []
        for r in rows:
            normalized = self._normalize_tag(str(r.tag))
            if not self._is_valid_tag(normalized):
                continue
            raw_candidates.append((normalized, int(r.cnt)))

        if not raw_candidates:
            return []

        # 合并同名标签（标准化后可能重复）
        global_heat: dict[str, int] = {}
        for name, cnt in raw_candidates:
            global_heat[name] = global_heat.get(name, 0) + cnt

        # 未登录或无兴趣画像：直接按全站热度返回
        if not current_user_id:
            top = sorted(global_heat.items(), key=lambda x: x[1], reverse=True)[:limit]
            return [TrendingTag(name=name, count=cnt) for name, cnt in top]

        interest = await self._get_user_tag_interest(current_user_id)
        if not interest:
            top = sorted(global_heat.items(), key=lambda x: x[1], reverse=True)[:limit]
            return [TrendingTag(name=name, count=cnt) for name, cnt in top]

        max_heat = max(global_heat.values()) if global_heat else 1
        max_interest = max(interest.values()) if interest else 1

        # 个性化混排分数：0.7 * 全站热度 + 0.3 * 用户兴趣
        scored = []
        for name, cnt in global_heat.items():
            heat_norm = cnt / max_heat if max_heat > 0 else 0.0
            interest_norm = interest.get(name, 0) / max_interest if max_interest > 0 else 0.0
            score = 0.7 * heat_norm + 0.3 * interest_norm
            scored.append((name, cnt, score))

        scored.sort(key=lambda x: (x[2], x[1]), reverse=True)
        top = scored[:limit]
        return [TrendingTag(name=name, count=cnt) for name, cnt, _ in top]

    def _normalize_tag(self, raw: str) -> str:
        tag = raw.strip().replace("#", "")
        tag = re.sub(r"\s+", "", tag)
        return tag[:20]

    def _is_valid_tag(self, tag: str) -> bool:
        if not tag:
            return False
        if len(tag) < 2:
            return False

        low_quality_words = {
            "测试", "test", "123", "111", "aaa", "哈哈", "呵呵", "广告", "推广", "引流", "加微信", "vx",
            "unknown", "null", "none", "无", "默认", "other", "others",
        }
        if tag.lower() in low_quality_words:
            return False

        if re.fullmatch(r"[\W_]+", tag):
            return False
        if re.fullmatch(r"\d+", tag):
            return False
        if re.fullmatch(r"(.)\1{2,}", tag):
            return False

        return True

    async def _get_user_tag_interest(self, user_id: uuid.UUID) -> dict[str, int]:
        """近60天用户兴趣标签权重：自己公开梦境标签 + 自己解梦评论标签"""
        # 自己公开梦境标签
        dream_stmt = sa_text("""
            SELECT t.name AS tag, COUNT(*) AS cnt
            FROM dream_tags dt
            JOIN tags t ON t.id = dt.tag_id
            JOIN dreams d ON d.id = dt.dream_id
            WHERE d.user_id = :user_id
              AND d.privacy_level = 'PUBLIC'
              AND d.is_draft = FALSE
              AND d.deleted_at IS NULL
              AND d.created_at > NOW() - INTERVAL '60 days'
            GROUP BY t.name
        """)
        dream_rows = (await self.db.execute(dream_stmt, {"user_id": user_id})).all()

        # 自己近60天参与解梦评论所对应梦境的标签（兴趣外显行为）
        comment_stmt = sa_text("""
            SELECT t.name AS tag, COUNT(*) AS cnt
            FROM comments c
            JOIN dreams d ON d.id = c.dream_id
            JOIN dream_tags dt ON dt.dream_id = d.id
            JOIN tags t ON t.id = dt.tag_id
            WHERE c.user_id = :user_id
              AND c.is_interpretation = TRUE
              AND c.deleted_at IS NULL
              AND c.created_at > NOW() - INTERVAL '60 days'
              AND d.privacy_level = 'PUBLIC'
              AND d.is_draft = FALSE
              AND d.deleted_at IS NULL
            GROUP BY t.name
        """)
        comment_rows = (await self.db.execute(comment_stmt, {"user_id": user_id})).all()

        interest: dict[str, int] = {}

        # 梦境标签权重 1.0
        for r in dream_rows:
            name = self._normalize_tag(str(r.tag))
            if not self._is_valid_tag(name):
                continue
            interest[name] = interest.get(name, 0) + int(r.cnt)

        # 解梦行为标签权重 1.5
        for r in comment_rows:
            name = self._normalize_tag(str(r.tag))
            if not self._is_valid_tag(name):
                continue
            interest[name] = interest.get(name, 0) + int(round(int(r.cnt) * 1.5))

        return interest

    # ── 推荐用户 ──────────────────────────────────────────────────────────────

    async def _get_recommended_users(
        self, current_user_id: uuid.UUID | None
    ) -> list[RecommendedUser]:
        cache_key = _KEY_USERS.format(user_id=str(current_user_id) if current_user_id else "anon")
        cached = await self.redis.get(cache_key)
        if cached:
            return [RecommendedUser(**item) for item in json.loads(cached)]

        result = await self._run_in_savepoint(self._compute_recommended_users(current_user_id), [])
        if result:
            payload = [u.model_dump(mode="json") for u in result]
            await self.redis.setex(cache_key, _TTL_USERS, json.dumps(payload))
        return result

    async def _compute_recommended_users(
        self, current_user_id: uuid.UUID | None, limit: int = 5
    ) -> list[RecommendedUser]:
        """
        活跃解梦者排序：全站热度 +（登录用户）标签兴趣相似度
        热度分 = 解读数×3 + 粉丝数×0.5 + 公开梦境数×1 + 等级×10
        个性化分 = 0.75 * 热度归一 + 0.25 * 兴趣相似度
        """
        following_ids: set[uuid.UUID] = set()
        if current_user_id:
            fstmt = select(UserFollow.following_id).where(UserFollow.follower_id == current_user_id)
            following_ids = set((await self.db.execute(fstmt)).scalars().all())

        stmt = (
            select(User)
            .where(
                User.interpretation_count >= 1,
                User.public_dream_count >= 1,
            )
            .order_by(
                desc(
                    User.interpretation_count * 3
                    + User.follower_count * 0.5
                    + User.public_dream_count
                    + User.dreamer_level * 10
                )
            )
            .limit(max(limit * 6, 30))
        )
        users = (await self.db.execute(stmt)).scalars().all()

        candidates: list[User] = []
        for u in users:
            if current_user_id and u.id == current_user_id:
                continue
            if u.id in following_ids:
                continue
            candidates.append(u)

        if not candidates:
            newcomer_stmt = (
                select(User)
                .where(User.username.is_not(None))
                .order_by(desc(User.created_at))
                .limit(limit)
            )
            newcomers = (await self.db.execute(newcomer_stmt)).scalars().all()
            return [
                RecommendedUser(
                    id=u.id,
                    username=u.username,
                    avatar=u.avatar,
                    dreamer_title=getattr(u, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(u, "dreamer_level", 1),
                    interpretation_count=u.interpretation_count,
                    follower_count=u.follower_count,
                    is_fallback=True,
                )
                for u in newcomers
            ]

        heat_scores: dict[uuid.UUID, float] = {
            u.id: float(u.interpretation_count * 3 + u.follower_count * 0.5 + u.public_dream_count + u.dreamer_level * 10)
            for u in candidates
        }

        personalized_scores: dict[uuid.UUID, float] = {u.id: heat_scores[u.id] for u in candidates}

        if current_user_id:
            interest = await self._get_user_tag_interest(current_user_id)
            if interest:
                candidate_profiles = await self._get_users_tag_profiles([u.id for u in candidates])
                max_heat = max(heat_scores.values()) if heat_scores else 1.0
                max_interest = max(interest.values()) if interest else 1

                for u in candidates:
                    profile = candidate_profiles.get(u.id, {})
                    similarity = 0.0
                    if profile:
                        overlap = 0.0
                        for tag, cnt in profile.items():
                            overlap += min(cnt, interest.get(tag, 0))
                        similarity = overlap / max_interest if max_interest > 0 else 0.0
                    heat_norm = heat_scores[u.id] / max_heat if max_heat > 0 else 0.0
                    personalized_scores[u.id] = 0.75 * heat_norm + 0.25 * similarity

        ranked = sorted(candidates, key=lambda u: personalized_scores[u.id], reverse=True)[:limit]

        return [
            RecommendedUser(
                id=u.id,
                username=u.username,
                avatar=u.avatar,
                dreamer_title=getattr(u, "dreamer_title", "做梦者"),
                dreamer_level=getattr(u, "dreamer_level", 1),
                interpretation_count=u.interpretation_count,
                follower_count=u.follower_count,
                is_fallback=False,
            )
            for u in ranked
        ]

    async def _get_users_tag_profiles(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, int]]:
        if not user_ids:
            return {}

        stmt = sa_text("""
            SELECT d.user_id AS user_id, t.name AS tag, COUNT(*) AS cnt
            FROM dreams d
            JOIN dream_tags dt ON dt.dream_id = d.id
            JOIN tags t ON t.id = dt.tag_id
            WHERE d.user_id = ANY(:user_ids)
              AND d.privacy_level = 'PUBLIC'
              AND d.is_draft = FALSE
              AND d.deleted_at IS NULL
              AND d.created_at > NOW() - INTERVAL '60 days'
            GROUP BY d.user_id, t.name
        """)
        rows = (await self.db.execute(stmt, {"user_ids": user_ids})).all()

        profiles: dict[uuid.UUID, dict[str, int]] = {}
        for r in rows:
            uid = r.user_id
            tag = self._normalize_tag(str(r.tag))
            if not self._is_valid_tag(tag):
                continue
            if uid not in profiles:
                profiles[uid] = {}
            profiles[uid][tag] = profiles[uid].get(tag, 0) + int(r.cnt)
        return profiles

    async def _get_rising_users(self) -> list[RisingInterpreter]:
        cached = await self.redis.get(_KEY_RISING_USERS)
        if cached:
            return [RisingInterpreter(**item) for item in json.loads(cached)]

        result = await self._run_in_savepoint(self._compute_rising_users(), [])
        if result:
            payload = [u.model_dump(mode="json") for u in result]
            await self.redis.setex(_KEY_RISING_USERS, _TTL_RISING_USERS, json.dumps(payload))
        return result

    async def _compute_rising_users(self, limit: int = 5) -> list[RisingInterpreter]:
        """本周新星：近7天解梦数相对前7天增长最多，且本周解梦>=2"""
        stmt = sa_text("""
            WITH this_week AS (
                SELECT user_id, COUNT(*)::int AS cnt
                FROM comments
                WHERE is_interpretation = TRUE
                  AND deleted_at IS NULL
                  AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY user_id
            ),
            last_week AS (
                SELECT user_id, COUNT(*)::int AS cnt
                FROM comments
                WHERE is_interpretation = TRUE
                  AND deleted_at IS NULL
                  AND created_at >= NOW() - INTERVAL '14 days'
                  AND created_at < NOW() - INTERVAL '7 days'
                GROUP BY user_id
            )
            SELECT
                u.id,
                u.username,
                u.avatar,
                COALESCE(u.dreamer_level, 1) AS dreamer_level,
                COALESCE(u.interpretation_count, 0) AS interpretation_count,
                COALESCE(t.cnt, 0) - COALESCE(l.cnt, 0) AS weekly_growth,
                COALESCE(t.cnt, 0) AS this_week_cnt
            FROM users u
            JOIN this_week t ON t.user_id = u.id
            LEFT JOIN last_week l ON l.user_id = u.id
            WHERE COALESCE(t.cnt, 0) >= 2
            ORDER BY weekly_growth DESC, this_week_cnt DESC, interpretation_count DESC
            LIMIT :limit
        """)
        rows = (await self.db.execute(stmt, {"limit": limit})).all()
        return [
            RisingInterpreter(
                id=r.id,
                username=r.username,
                avatar=r.avatar,
                dreamer_level=int(r.dreamer_level or 1),
                interpretation_count=int(r.interpretation_count or 0),
                weekly_growth=int(r.weekly_growth or 0),
            )
            for r in rows
        ]

    # ── 社区动态业务指标 ──────────────────────────────────────────────────────

    async def _get_community_metrics(self) -> CommunityMetrics:
        return await self._run_in_savepoint(self._compute_community_metrics(), CommunityMetrics())

    async def _compute_community_metrics(self) -> CommunityMetrics:
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        since_24h = now - timedelta(hours=24)

        # 今日新增公开梦境
        today_new_dreams = (
            await self.db.execute(
                select(func.count(Dream.id)).where(
                    Dream.created_at >= day_start,
                    Dream.privacy_level == "PUBLIC",
                    Dream.deleted_at.is_(None),
                )
            )
        ).scalar() or 0

        # 今日解梦回复（解释类评论）
        today_interpretation_replies = (
            await self.db.execute(
                select(func.count(Comment.id)).where(
                    Comment.created_at >= day_start,
                    Comment.is_interpretation.is_(True),
                    Comment.deleted_at.is_(None),
                )
            )
        ).scalar() or 0

        # 24h 活跃用户：近24h 发梦 或 评论/解梦 的去重用户数
        active_users_24h = (
            await self.db.execute(
                select(func.count(func.distinct(User.id))).where(
                    or_(
                        User.id.in_(
                            select(Dream.user_id).where(
                                Dream.created_at >= since_24h,
                                Dream.deleted_at.is_(None),
                            )
                        ),
                        User.id.in_(
                            select(Comment.user_id).where(
                                Comment.created_at >= since_24h,
                                Comment.deleted_at.is_(None),
                            )
                        ),
                    )
                )
            )
        ).scalar() or 0

        return CommunityMetrics(
            today_new_dreams=int(today_new_dreams),
            today_interpretation_replies=int(today_interpretation_replies),
            active_users_24h=int(active_users_24h),
        )

    # ── 工具：savepoint 隔离（防止单个查询失败污染整个 session 事务）──────────────

    async def _run_in_savepoint(self, coro, default):
        """在 SAVEPOINT 内执行协程：失败时回滚到 savepoint，不影响后续查询"""
        try:
            async with self.db.begin_nested():
                return await coro
        except Exception as e:
            logger.warning("trending query failed (savepoint rolled back): %s", e)
            return default

    # ── 工具：写入搜索历史（由 API 层异步调用）──────────────────────────────────

    async def record_search(
        self,
        query: str,
        result_count: int,
        user_id: uuid.UUID | None = None,
    ) -> None:
        """记录一条搜索历史（静默失败，不阻塞主流程）"""
        try:
            self.db.add(SearchHistory(
                user_id=user_id,
                query=query.strip()[:200],
                result_count=result_count,
            ))
            await self.db.flush()
        except Exception as e:
            logger.warning("记录搜索历史失败: %s", e)


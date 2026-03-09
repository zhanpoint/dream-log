"""
社区服务：Feed 查询、共鸣、评论、关注、收藏、举报、梦境社群
"""

import random
import uuid
import logging
import math
from datetime import datetime, timezone, timedelta

from sqlalchemy import case, func, select, update, delete, desc, and_, exists, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.featured import FEATURED_CONFIG
from app.models.community import Bookmark, Comment, CommentLike, Report, Resonance, UserFollow
from app.models.community_group import Community, CommunityMember
from app.models.dream import Dream
from app.services.heat_service import recalculate_dream_heat
from app.models.dream_embedding import DreamEmbedding
from app.models.enums import PrivacyLevel
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.community import (
    ActiveInterpreter,
    CommentAuthor,
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommunityJoinResponse,
    CommunityListResponse,
    CommunityResponse,
    DreamCardSocial,
    ExploreResponse,
    FeedResponse,
    SearchResponse,
    SimilarDreamer,
    TrendingTag,
    UserPublicBrief,
    UserPublicProfile,
    UserSearchResult,
)

# ── 筑梦师等级阈值定义 ──────────────────────────────────────────────────────────
DREAMER_LEVELS = [
    (0,    1, "做梦者"),
    (50,   2, "梦境探索者"),
    (200,  3, "梦境记录师"),
    (500,  4, "筑梦师"),
    (1000, 5, "梦境大师"),
    (2000, 6, "造梦先知"),
]

# 灵感值积分规则
POINTS_RULES = {
    "publish": 5,       # 发布公开梦境
    "resonance": 2,     # 收到他人共鸣
    "comment": 3,       # 发表评论/解读
    "adopted": 20,      # 解读被采纳
    "featured": 50,     # 梦境被精选
}

logger = logging.getLogger(__name__)

ANONYMOUS_ALIASES = [
    "午夜漫游者", "云端做梦人", "星河探索者", "月光旅行者",
    "迷雾中的人", "梦境漫步者", "深夜思考者", "幻想追寻者",
]

FEATURE_MODE_AUTO = "AUTO"
FEATURE_MODE_FORCE_ON = "FORCE_ON"
FEATURE_MODE_FORCE_OFF = "FORCE_OFF"


def _random_alias(dream_id: uuid.UUID) -> str:
    """基于 dream_id 生成确定性匿名别名"""
    idx = int(str(dream_id).replace("-", ""), 16) % len(ANONYMOUS_ALIASES)
    return ANONYMOUS_ALIASES[idx]


class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _refresh_featured_snapshot_if_needed(self, dream_id: uuid.UUID) -> None:
        """互动后自动刷新精选快照（失败不影响主流程）"""
        try:
            await self.refresh_featured_snapshot(dream_id)
        except Exception as e:
            logger.warning("refresh_featured_snapshot 失败 dream_id=%s: %s", dream_id, e)

    # ── 积分 & 等级 ──────────────────────────────────────────────────────────

    async def _award_points(self, user_id: uuid.UUID, action: str) -> None:
        """给用户加灵感值积分，并同步更新筑梦师等级"""
        points = POINTS_RULES.get(action, 0)
        if points <= 0:
            return
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(inspiration_points=User.inspiration_points + points)
        )
        await self._update_dreamer_level(user_id)

    async def _update_dreamer_level(self, user_id: uuid.UUID) -> None:
        """根据当前积分自动更新筑梦师等级和称号"""
        user = await self.db.get(User, user_id)
        if not user:
            return
        points = user.inspiration_points
        level, title = 1, "做梦者"
        for threshold, lv, t in DREAMER_LEVELS:
            if points >= threshold:
                level, title = lv, t
        if user.dreamer_level != level or user.dreamer_title != title:
            await self.db.execute(
                update(User)
                .where(User.id == user_id)
                .values(dreamer_level=level, dreamer_title=title)
            )

    # ── 社区梦境动态流 ─────────────────────────────────────────────────────

    async def get_feed(
        self,
        *,
        channel: str = "plaza",
        sort: str = "latest",
        current_user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> FeedResponse:
        """获取社区梦境动态流（支持频道过滤和排序）"""
        # 「为你推荐」调用独立方法
        if sort == "foryou":
            if current_user_id:
                return await self.get_personalized_feed(current_user_id, page=page, page_size=page_size)
            else:
                # 未登录时降级为最新
                sort = "latest"

        base = (
            select(Dream)
            .where(Dream.privacy_level == PrivacyLevel.PUBLIC, Dream.deleted_at.is_(None))
        )

        # 频道过滤：plaza=梦境广场，roundtable=解梦求助，greenhouse=梦境社群，museum=精选梦境
        if channel == "roundtable":
            base = base.where(Dream.is_seeking_interpretation.is_(True))
        elif channel == "greenhouse":
            base = base.where(Dream.community_id.isnot(None))
        elif channel == "museum":
            base = base.where(
                or_(
                    Dream.feature_mode == FEATURE_MODE_FORCE_ON,
                    and_(
                        Dream.feature_mode == FEATURE_MODE_AUTO,
                        Dream.featured_score_snapshot >= FEATURED_CONFIG.auto_threshold,
                    ),
                )
            )
        # plaza = 全部公开，默认不额外过滤

        # 关注者过滤（following 排序时过滤）
        if sort == "following" and current_user_id:
            following_subq = select(UserFollow.following_id).where(UserFollow.follower_id == current_user_id)
            base = base.where(Dream.user_id.in_(following_subq))

        # 排序：最热按频道策略
        if sort == "resonating":
            if channel == "museum":
                # 精选：基础分×质量，不乘时间衰减
                base_expr = (
                    Dream.resonance_count * 3
                    + Dream.comment_count * 5
                    + Dream.interpretation_count * 10
                    + Dream.adopted_interpretation_count * 5
                    + Dream.bookmark_count * 4
                    + func.floor(Dream.view_count / 10)
                )
                quality = case((Dream.is_featured.is_(True), 1.3), else_=1.0) * case(
                    (Dream.is_seeking_interpretation.is_(True), 1.1), else_=1.0
                )
                base = base.order_by(desc(base_expr * quality), desc(Dream.created_at))
            elif channel == "roundtable":
                # 解梦求助：heat_score × 求助加成（无解读1.5 / 有未采纳1.2 / 已采纳0.8）
                help_bonus = case(
                    (Dream.adopted_interpretation_count > 0, 0.8),
                    (Dream.interpretation_count > 0, 1.2),
                    else_=1.5,
                )
                base = base.order_by(desc(Dream.heat_score * help_bonus), desc(Dream.created_at))
            else:
                # 广场 / 社群：按 heat_score
                base = base.order_by(desc(Dream.heat_score), desc(Dream.created_at))
        elif sort in ("museum", "featured") or channel == "museum":
            base = base.order_by(desc(Dream.inspiration_score), desc(Dream.created_at))
        else:
            base = base.order_by(desc(Dream.created_at))

        # 统计总数
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # 分页
        offset = (page - 1) * page_size
        stmt = base.offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        dreams = result.scalars().all()

        # 批量查询当前用户的共鸣/收藏状态
        resonated_ids: set[uuid.UUID] = set()
        bookmarked_ids: set[uuid.UUID] = set()
        if current_user_id and dreams:
            dream_ids = [d.id for d in dreams]
            res_stmt = select(Resonance.dream_id).where(
                Resonance.user_id == current_user_id,
                Resonance.dream_id.in_(dream_ids),
            )
            resonated_ids = set((await self.db.execute(res_stmt)).scalars().all())

            bm_stmt = select(Bookmark.dream_id).where(
                Bookmark.user_id == current_user_id,
                Bookmark.dream_id.in_(dream_ids),
            )
            bookmarked_ids = set((await self.db.execute(bm_stmt)).scalars().all())

        # 批量查询作者信息
        author_ids = list({d.user_id for d in dreams})
        author_map: dict[uuid.UUID, User] = {}
        if author_ids:
            users_result = await self.db.execute(select(User).where(User.id.in_(author_ids)))
            for u in users_result.scalars().all():
                author_map[u.id] = u

        dream_counter_map = await self._get_dream_comment_counters_map([d.id for d in dreams])

        counter_map = await self._get_dream_comment_counters_map([d.id for d in dreams])

        items = []
        for dream in dreams:
            author = author_map.get(dream.user_id)
            author_brief = None
            if author and not dream.is_anonymous:
                author_brief = UserPublicBrief(
                    id=author.id,
                    username=author.username,
                    avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            elif dream.is_anonymous:
                alias = dream.anonymous_alias or _random_alias(dream.id)
                author_brief = UserPublicBrief(
                    id=uuid.UUID(int=0),
                    username=alias,
                    avatar=None,
                    dreamer_title="匿名做梦者",
                    dreamer_level=0,
                )

            comment_count, interpretation_count = dream_counter_map.get(dream.id, (0, 0))
            items.append(DreamCardSocial(
                id=dream.id,
                title=dream.title,
                content_preview=dream.content[:150] if dream.content else "",
                dream_date=str(dream.dream_date),
                dream_types=[],
                is_seeking_interpretation=dream.is_seeking_interpretation,
                is_anonymous=dream.is_anonymous,
                resonance_count=dream.resonance_count,
                comment_count=comment_count,
                interpretation_count=interpretation_count,
                view_count=dream.view_count,
                bookmark_count=dream.bookmark_count,
                share_count=getattr(dream, "share_count", 0),
                has_resonated=dream.id in resonated_ids,
                has_bookmarked=dream.id in bookmarked_ids,
                author=author_brief,
                created_at=dream.created_at,
            ))

        return FeedResponse(total=total, page=page, page_size=page_size, items=items)

    # ── 共鸣 ────────────────────────────────────────────────────────────

    async def toggle_resonance(self, dream_id: uuid.UUID, user_id: uuid.UUID) -> tuple[bool, int]:
        """切换共鸣状态，返回 (resonated, new_count)"""
        stmt = select(Resonance).where(Resonance.user_id == user_id, Resonance.dream_id == dream_id)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()

        dream = await self.db.get(Dream, dream_id)
        if not dream:
            raise ValueError("梦境不存在")

        if existing:
            await self.db.delete(existing)
            new_count = max(0, dream.resonance_count - 1)
            resonated = False
        else:
            self.db.add(Resonance(user_id=user_id, dream_id=dream_id))
            new_count = dream.resonance_count + 1
            resonated = True
            # 梦境作者获得共鸣积分
            if dream.user_id != user_id:
                await self._award_points(dream.user_id, "resonance")

        await self.db.execute(update(Dream).where(Dream.id == dream_id).values(resonance_count=new_count))
        await self.db.refresh(dream)
        await recalculate_dream_heat(self.db, dream_id)
        await self._refresh_featured_snapshot_if_needed(dream_id)
        await self.db.flush()
        return resonated, new_count

    # ── 评论 ────────────────────────────────────────────────────────────

    async def _get_dream_comment_counters(self, dream_id: uuid.UUID) -> tuple[int, int]:
        """从评论表实时统计：comment_count=普通评论，interpretation_count=解读。"""
        counters = await self._get_dream_comment_counters_map([dream_id])
        return counters.get(dream_id, (0, 0))

    async def _get_dream_comment_counters_map(
        self, dream_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, tuple[int, int]]:
        """批量统计每个 dream 的评论/解读数（均不含 deleted）。"""
        if not dream_ids:
            return {}

        stmt = (
            select(
                Comment.dream_id,
                func.sum(case((Comment.is_interpretation.is_(False), 1), else_=0)).label("comment_count"),
                func.sum(case((Comment.is_interpretation.is_(True), 1), else_=0)).label("interpretation_count"),
            )
            .where(Comment.dream_id.in_(dream_ids), Comment.deleted_at.is_(None))
            .group_by(Comment.dream_id)
        )
        rows = (await self.db.execute(stmt)).all()
        counter_map: dict[uuid.UUID, tuple[int, int]] = {
            row.dream_id: (int(row.comment_count or 0), int(row.interpretation_count or 0))
            for row in rows
        }
        for did in dream_ids:
            counter_map.setdefault(did, (0, 0))
        return counter_map

    async def _sync_dream_comment_counters(self, dream_id: uuid.UUID) -> tuple[int, int]:
        """将 dreams 表中的评论/解读计数与评论表强一致同步。"""
        comment_count, interpretation_count = await self._get_dream_comment_counters(dream_id)
        await self.db.execute(
            update(Dream)
            .where(Dream.id == dream_id)
            .values(
                comment_count=comment_count,
                interpretation_count=interpretation_count,
            )
        )
        return comment_count, interpretation_count

    async def get_comments(
        self,
        dream_id: uuid.UUID,
        *,
        is_interpretation: bool | None = None,
        parent_id: uuid.UUID | None = None,
        current_user_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> CommentListResponse:
        """获取梦境评论列表；parent_id 为 None 时返回顶级评论，否则返回该评论的回复"""
        stmt = select(Comment).where(Comment.dream_id == dream_id, Comment.deleted_at.is_(None))
        if parent_id is None:
            stmt = stmt.where(Comment.parent_id.is_(None))
        else:
            stmt = stmt.where(Comment.parent_id == parent_id)
        if is_interpretation is not None:
            stmt = stmt.where(Comment.is_interpretation == is_interpretation)
        stmt = stmt.order_by(Comment.is_adopted.desc(), desc(Comment.created_at))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        comments = result.scalars().all()

        # 批量获取作者
        user_ids = list({c.user_id for c in comments})
        author_map: dict[uuid.UUID, User] = {}
        if user_ids:
            users_res = await self.db.execute(select(User).where(User.id.in_(user_ids)))
            for u in users_res.scalars().all():
                author_map[u.id] = u

        # 当前用户赞同/反对状态（赞同=like，反对=downvote，与共鸣无关）
        upvoted_ids: set[uuid.UUID] = set()
        downvoted_ids: set[uuid.UUID] = set()
        if current_user_id and comments:
            comment_ids = [c.id for c in comments]
            vote_res = await self.db.execute(
                select(CommentLike.comment_id, CommentLike.reaction_type).where(
                    CommentLike.user_id == current_user_id,
                    CommentLike.comment_id.in_(comment_ids),
                )
            )
            for row in vote_res.all():
                cid, rtype = row[0], row[1]
                if rtype == "like":
                    upvoted_ids.add(cid)
                elif rtype == "downvote":
                    downvoted_ids.add(cid)

        # 回复数量
        reply_counts: dict[uuid.UUID, int] = {}
        if comments:
            comment_ids = [c.id for c in comments]
            reply_stmt = (
                select(Comment.parent_id, func.count().label("cnt"))
                .where(Comment.parent_id.in_(comment_ids), Comment.deleted_at.is_(None))
                .group_by(Comment.parent_id)
            )
            for row in (await self.db.execute(reply_stmt)).all():
                reply_counts[row.parent_id] = row.cnt

        items = []
        for c in comments:
            u = author_map.get(c.user_id)
            author = None
            if not c.is_anonymous and u:
                author = CommentAuthor(id=u.id, username=u.username, avatar=u.avatar, dreamer_level=getattr(u, "dreamer_level", 1))
            elif c.is_anonymous:
                alias = c.anonymous_alias or "匿名用户"
                author = CommentAuthor(id=uuid.UUID(int=0), username=alias, avatar=None, dreamer_level=0)

            items.append(CommentResponse(
                id=c.id,
                dream_id=c.dream_id,
                content=c.content,
                is_interpretation=c.is_interpretation,
                is_adopted=c.is_adopted,
                like_count=c.like_count,
                downvote_count=getattr(c, "downvote_count", 0),
                inspire_count=c.inspire_count,
                is_anonymous=c.is_anonymous,
                has_liked=c.id in upvoted_ids,
                has_downvoted=c.id in downvoted_ids,
                author=author,
                parent_id=c.parent_id,
                reply_count=reply_counts.get(c.id, 0),
                created_at=c.created_at,
                updated_at=c.updated_at,
            ))

        return CommentListResponse(total=total, items=items)

    async def create_comment(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
        data: CommentCreate,
    ) -> Comment:
        """发表评论或解读"""
        dream = await self.db.get(Dream, dream_id)
        if not dream or dream.privacy_level != PrivacyLevel.PUBLIC:
            raise ValueError("梦境不存在或不可评论")

        comment = Comment(
            dream_id=dream_id,
            user_id=user_id,
            content=data.content,
            is_interpretation=data.is_interpretation,
            parent_id=data.parent_id,
        )
        self.db.add(comment)

        # 更新梦境计数：评论与解读严格分离
        if data.is_interpretation:
            await self.db.execute(
                update(Dream).where(Dream.id == dream_id).values(
                    interpretation_count=Dream.interpretation_count + 1,
                )
            )
            await self.db.execute(update(User).where(User.id == user_id).values(
                interpretation_count=User.interpretation_count + 1
            ))
        else:
            await self.db.execute(
                update(Dream).where(Dream.id == dream_id).values(comment_count=Dream.comment_count + 1)
            )

        # 评论/解读者获得积分
        await self._award_points(user_id, "comment")
        await self.db.refresh(dream)
        await recalculate_dream_heat(self.db, dream_id)
        await self._refresh_featured_snapshot_if_needed(dream_id)

        await self.db.flush()
        await self.db.refresh(comment)
        return comment

    async def delete_comment(self, comment_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """软删除评论，并同步更新梦境的评论/解读计数"""
        comment = await self.db.get(Comment, comment_id)
        if not comment or comment.user_id != user_id:
            return False
        comment.deleted_at = datetime.utcnow()
        await self.db.flush()

        # 梦境计数与列表一致：评论与解读分开递减
        if comment.is_interpretation:
            await self.db.execute(
                update(Dream)
                .where(Dream.id == comment.dream_id)
                .values(interpretation_count=func.greatest(0, Dream.interpretation_count - 1))
            )
        else:
            await self.db.execute(
                update(Dream)
                .where(Dream.id == comment.dream_id)
                .values(comment_count=func.greatest(0, Dream.comment_count - 1))
            )
        await self._refresh_featured_snapshot_if_needed(comment.dream_id)
        await self.db.flush()
        return True

    async def adopt_interpretation(self, comment_id: uuid.UUID, dream_owner_id: uuid.UUID) -> bool:
        """采纳解读（仅梦境作者可操作）"""
        stmt = select(Comment).where(Comment.id == comment_id, Comment.is_interpretation.is_(True))
        comment = (await self.db.execute(stmt)).scalar_one_or_none()
        if not comment:
            return False

        dream = await self.db.get(Dream, comment.dream_id)
        if not dream or dream.user_id != dream_owner_id:
            return False

        # 先取消同梦境下已采纳的解读
        await self.db.execute(
            update(Comment)
            .where(Comment.dream_id == comment.dream_id, Comment.is_adopted.is_(True))
            .values(is_adopted=False)
        )
        comment.is_adopted = True

        # 梦境采纳数置 1，并重算热度
        await self.db.execute(
            update(Dream).where(Dream.id == comment.dream_id).values(adopted_interpretation_count=1)
        )
        await self.db.refresh(dream)
        await recalculate_dream_heat(self.db, comment.dream_id)

        # 解读者获得采纳积分（含等级更新）
        await self._award_points(comment.user_id, "adopted")

        # 更新梦境灵感分
        await self._recalculate_inspiration_score(comment.dream_id)
        await self._refresh_featured_snapshot_if_needed(comment.dream_id)

        await self.db.flush()
        return True

    async def _recalculate_inspiration_score(self, dream_id: uuid.UUID) -> None:
        """重算单个梦境灵感分：共鸣×2 + 评论×1.5 + 解读×3"""
        dream = await self.db.get(Dream, dream_id)
        if not dream:
            return
        score = (
            dream.resonance_count * 2.0
            + dream.comment_count * 1.5
            + dream.interpretation_count * 3.0
        )
        await self.db.execute(
            update(Dream).where(Dream.id == dream_id).values(inspiration_score=score)
        )

    async def set_comment_vote(
        self, comment_id: uuid.UUID, user_id: uuid.UUID, vote: str | None
    ) -> tuple[str | None, int, int]:
        """设置评论赞同/反对。vote: 'up'|'down'|None。返回 (当前投票, 赞同数, 反对数)。与梦境共鸣无关。"""
        if vote is not None and vote not in ("up", "down"):
            raise ValueError("vote 必须为 'up'、'down' 或 None")
        comment = await self.db.get(Comment, comment_id)
        if not comment:
            raise ValueError("评论不存在")

        stmt = select(CommentLike).where(
            CommentLike.comment_id == comment_id, CommentLike.user_id == user_id
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            if existing.reaction_type == "like":
                await self.db.execute(
                    update(Comment).where(Comment.id == comment_id).values(like_count=func.greatest(0, Comment.like_count - 1))
                )
            elif existing.reaction_type == "downvote":
                await self.db.execute(
                    update(Comment).where(Comment.id == comment_id).values(downvote_count=func.greatest(0, Comment.downvote_count - 1))
                )

        if vote == "up":
            self.db.add(CommentLike(user_id=user_id, comment_id=comment_id, reaction_type="like"))
            await self.db.execute(
                update(Comment).where(Comment.id == comment_id).values(like_count=Comment.like_count + 1)
            )
        elif vote == "down":
            self.db.add(CommentLike(user_id=user_id, comment_id=comment_id, reaction_type="downvote"))
            await self.db.execute(
                update(Comment).where(Comment.id == comment_id).values(downvote_count=Comment.downvote_count + 1)
            )

        await self.db.flush()
        await self.db.refresh(comment)
        up = getattr(comment, "like_count", 0) or 0
        down = getattr(comment, "downvote_count", 0) or 0
        return (vote, up, down)

    # ── 关注 ────────────────────────────────────────────────────────────

    async def toggle_follow(self, follower_id: uuid.UUID, following_id: uuid.UUID) -> tuple[bool, int]:
        """切换关注状态，返回 (following, new_follower_count)"""
        if follower_id == following_id:
            raise ValueError("不能关注自己")

        stmt = select(UserFollow).where(
            UserFollow.follower_id == follower_id, UserFollow.following_id == following_id
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        target_user = await self.db.get(User, following_id)
        if not target_user:
            raise ValueError("用户不存在")

        if existing:
            await self.db.delete(existing)
            new_follower_count = max(0, target_user.follower_count - 1)
            await self.db.execute(
                update(User).where(User.id == following_id).values(follower_count=new_follower_count)
            )
            await self.db.execute(
                update(User).where(User.id == follower_id).values(
                    following_count=func.greatest(0, User.following_count - 1)
                )
            )
            return False, new_follower_count
        else:
            self.db.add(UserFollow(follower_id=follower_id, following_id=following_id))
            new_follower_count = target_user.follower_count + 1
            await self.db.execute(
                update(User).where(User.id == following_id).values(follower_count=new_follower_count)
            )
            await self.db.execute(
                update(User).where(User.id == follower_id).values(following_count=User.following_count + 1)
            )
            await self.db.flush()
            return True, new_follower_count

    async def is_following(self, follower_id: uuid.UUID, following_id: uuid.UUID) -> bool:
        stmt = select(exists().where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id,
        ))
        return bool((await self.db.execute(stmt)).scalar())

    # ── 用户主页 ─────────────────────────────────────────────────────────

    async def get_user_profile(self, user_id: uuid.UUID, current_user_id: uuid.UUID | None = None) -> UserPublicProfile | None:
        user = await self.db.get(User, user_id)
        if not user:
            return None
        is_following = False
        if current_user_id and current_user_id != user_id:
            is_following = await self.is_following(current_user_id, user_id)
        return UserPublicProfile(
            id=user.id,
            username=user.username,
            avatar=user.avatar,
            bio=user.bio,
            dreamer_title=getattr(user, "dreamer_title", "做梦者"),
            dreamer_level=getattr(user, "dreamer_level", 1),
            inspiration_points=getattr(user, "inspiration_points", 0),
            public_dream_count=getattr(user, "public_dream_count", 0),
            interpretation_count=getattr(user, "interpretation_count", 0),
            follower_count=getattr(user, "follower_count", 0),
            following_count=getattr(user, "following_count", 0),
            is_following=is_following,
        )

    async def get_dream_detail(
        self, dream_id: uuid.UUID, current_user_id: uuid.UUID | None = None
    ) -> DreamCardSocial | None:
        """获取单个公开梦境详情"""
        stmt = select(Dream).where(
            Dream.id == dream_id,
            Dream.privacy_level == PrivacyLevel.PUBLIC,
            Dream.deleted_at.is_(None),
        )
        dream = (await self.db.execute(stmt)).scalar_one_or_none()
        if not dream:
            return None

        author = await self.db.get(User, dream.user_id) if not dream.is_anonymous else None
        author_brief = None
        if dream.is_anonymous:
            alias = dream.anonymous_alias or _random_alias(dream.id)
            author_brief = UserPublicBrief(
                id=uuid.UUID(int=0),
                username=alias,
                avatar=None,
                dreamer_title="匿名做梦者",
                dreamer_level=0,
            )
        elif author:
            author_brief = UserPublicBrief(
                id=author.id,
                username=author.username,
                avatar=author.avatar,
                dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                dreamer_level=getattr(author, "dreamer_level", 1),
            )

        has_resonated = False
        has_bookmarked = False
        if current_user_id:
            has_resonated = bool(
                (await self.db.execute(
                    select(Resonance).where(Resonance.user_id == current_user_id, Resonance.dream_id == dream_id)
                )).scalar_one_or_none()
            )
            has_bookmarked = bool(
                (await self.db.execute(
                    select(Bookmark).where(Bookmark.user_id == current_user_id, Bookmark.dream_id == dream_id)
                )).scalar_one_or_none()
            )

        comment_count, interpretation_count = await self._get_dream_comment_counters(dream.id)

        return DreamCardSocial(
            id=dream.id,
            title=dream.title,
            content_preview=dream.content or "",
            dream_date=str(dream.dream_date),
            dream_types=[],
            is_seeking_interpretation=dream.is_seeking_interpretation,
            is_anonymous=dream.is_anonymous,
            resonance_count=dream.resonance_count,
            comment_count=comment_count,
            interpretation_count=interpretation_count,
            view_count=dream.view_count,
            bookmark_count=dream.bookmark_count,
            share_count=getattr(dream, "share_count", 0),
            has_resonated=has_resonated,
            has_bookmarked=has_bookmarked,
            author=author_brief,
            created_at=dream.created_at,
        )

    async def increment_dream_view(self, dream_id: uuid.UUID) -> int | None:
        """公开梦境详情被查看时增加浏览数，返回最新 view_count；非公开或不存在返回 None"""
        stmt = select(Dream).where(
            Dream.id == dream_id,
            Dream.privacy_level == PrivacyLevel.PUBLIC,
            Dream.deleted_at.is_(None),
        )
        dream = (await self.db.execute(stmt)).scalar_one_or_none()
        if not dream:
            return None
        new_count = (dream.view_count or 0) + 1
        await self.db.execute(update(Dream).where(Dream.id == dream_id).values(view_count=new_count))
        await self.db.flush()
        await recalculate_dream_heat(self.db, dream_id)
        await self._refresh_featured_snapshot_if_needed(dream_id)
        return new_count

    async def increment_dream_share(self, dream_id: uuid.UUID) -> int | None:
        """用户点击分享时增加分享数，返回最新 share_count；非公开或不存在返回 None"""
        stmt = select(Dream).where(
            Dream.id == dream_id,
            Dream.privacy_level == PrivacyLevel.PUBLIC,
            Dream.deleted_at.is_(None),
        )
        dream = (await self.db.execute(stmt)).scalar_one_or_none()
        if not dream:
            return None
        new_count = (getattr(dream, "share_count", 0) or 0) + 1
        await self.db.execute(update(Dream).where(Dream.id == dream_id).values(share_count=new_count))
        await self.db.flush()
        await self._refresh_featured_snapshot_if_needed(dream_id)
        return new_count

    async def get_user_public_dreams(
        self, user_id: uuid.UUID, page: int = 1, page_size: int = 12
    ) -> FeedResponse:
        """获取用户公开梦境列表"""
        return await self.get_feed(
            channel="plaza",
            sort="latest",
            page=page,
            page_size=page_size,
        )

    # ── 个性化推荐 ────────────────────────────────────────────────────────

    async def get_personalized_feed(
        self, user_id: uuid.UUID, *, page: int = 1, page_size: int = 20
    ) -> FeedResponse:
        """「为你推荐」：基于用户最近梦境 embedding 中心向量 + 关注作者加权"""
        from sqlalchemy import text as sa_text

        # 1. 取用户最近梦境 embedding，最多 20 条；有几条算几条，只有一条都没有时才降级为「最新」
        user_emb_stmt = (
            select(DreamEmbedding.content_embedding)
            .join(Dream, Dream.id == DreamEmbedding.dream_id)
            .where(Dream.user_id == user_id, Dream.deleted_at.is_(None))
            .order_by(desc(Dream.created_at))
            .limit(20)
        )
        emb_rows = (await self.db.execute(user_emb_stmt)).scalars().all()
        valid_embs = [e for e in emb_rows if e is not None]

        if not valid_embs:
            # 无任何有效 embedding 时才降级为按时间排序的 feed
            return await self.get_feed(channel="plaza", sort="latest", current_user_id=user_id, page=page, page_size=page_size)

        # 2. 计算中心向量（平均）
        dim = len(valid_embs[0])
        center = [sum(e[i] for e in valid_embs) / len(valid_embs) for i in range(dim)]
        center_str = "[" + ",".join(str(v) for v in center) + "]"

        # 3. 获取用户关注的人（用于加权）
        following_ids_result = await self.db.execute(
            select(UserFollow.following_id).where(UserFollow.follower_id == user_id)
        )
        following_ids = set(following_ids_result.scalars().all())

        # 4. 按相似度查候选（多取以便关注加权重排）。分页返回的即是「全部」匹配结果，只是按页拆分
        fetch_limit = page_size * 5
        offset = (page - 1) * page_size

        sim_stmt = sa_text("""
            SELECT d.id, d.title, d.content, d.dream_date, d.primary_emotion,
                   d.emotion_tags, d.is_seeking_interpretation, d.is_anonymous,
                   d.resonance_count, d.comment_count, d.interpretation_count,
                   d.view_count, d.bookmark_count, d.share_count,
                   d.inspiration_score, d.is_featured, d.user_id, d.created_at,
                   d.anonymous_alias,
                   1 - (de.content_embedding <=> CAST(:center AS vector)) AS similarity
            FROM dream_embeddings de
            JOIN dreams d ON d.id = de.dream_id
            WHERE d.privacy_level = 'PUBLIC'
              AND d.deleted_at IS NULL
              AND d.user_id != :user_id
              AND d.id NOT IN (SELECT dream_id FROM resonances WHERE user_id = :user_id)
            ORDER BY de.content_embedding <=> CAST(:center AS vector)
            LIMIT :limit OFFSET :offset
        """)
        try:
            sim_result = await self.db.execute(sim_stmt, {
                "center": center_str,
                "user_id": str(user_id),
                "limit": fetch_limit,
                "offset": offset,
            })
            rows = sim_result.all()
        except Exception:
            return await self.get_feed(channel="plaza", sort="latest", current_user_id=user_id, page=page, page_size=page_size)

        # 5. 关注作者加权：关注的人的梦境在相似度基础上提升 30%，再按综合分排序取前 page_size
        FOLLOW_BOOST = 1.3
        scored = [(row, float(row.similarity) * (FOLLOW_BOOST if row.user_id in following_ids else 1.0)) for row in rows]
        scored.sort(key=lambda x: x[1], reverse=True)
        rows = [r for r, _ in scored[:page_size]]

        # 6. 批量获取作者信息
        author_ids = list({row.user_id for row in rows})
        author_map: dict[uuid.UUID, User] = {}
        if author_ids:
            for u in (await self.db.execute(select(User).where(User.id.in_(author_ids)))).scalars():
                author_map[u.id] = u

        # 7. 构建结果
        counter_map = await self._get_dream_comment_counters_map([row.id for row in rows])
        items = []
        for row in rows:
            author = author_map.get(row.user_id)
            author_brief = None
            if row.is_anonymous:
                alias = row.anonymous_alias or _random_alias(row.id)
                author_brief = UserPublicBrief(id=uuid.UUID(int=0), username=alias, avatar=None, dreamer_title="匿名做梦者", dreamer_level=0)
            elif author:
                author_brief = UserPublicBrief(
                    id=author.id, username=author.username, avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            comment_count, interpretation_count = counter_map.get(row.id, (0, 0))
            items.append(DreamCardSocial(
                id=row.id,
                title=row.title,
                content_preview=row.content[:150] if row.content else "",
                dream_date=str(row.dream_date),
                dream_types=[],
                is_seeking_interpretation=row.is_seeking_interpretation,
                is_anonymous=row.is_anonymous,
                resonance_count=row.resonance_count,
                comment_count=comment_count,
                interpretation_count=interpretation_count,
                view_count=getattr(row, "view_count", 0),
                bookmark_count=getattr(row, "bookmark_count", 0),
                share_count=getattr(row, "share_count", 0),
                has_resonated=False,
                has_bookmarked=False,
                author=author_brief,
                created_at=row.created_at,
            ))

        return FeedResponse(total=len(rows), page=page, page_size=page_size, items=items)

    async def get_advanced_personalized_feed(
        self, user_id: uuid.UUID, *, page: int = 1, page_size: int = 20
    ) -> FeedResponse:
        """高级推荐：多信号加权排序（向量相似度40% + 关注图25% + 灵感分20% + 时间衰减15%）"""
        from sqlalchemy import text as sa_text

        # 取用户最近 20 条梦境的 embedding（与 get_personalized_feed 一致）
        user_emb_stmt = (
            select(DreamEmbedding.content_embedding)
            .join(Dream, Dream.id == DreamEmbedding.dream_id)
            .where(Dream.user_id == user_id, Dream.deleted_at.is_(None))
            .order_by(desc(Dream.created_at))
            .limit(20)
        )
        emb_rows = (await self.db.execute(user_emb_stmt)).scalars().all()
        valid_embs = [e for e in emb_rows if e is not None]

        if not valid_embs:
            return await self.get_personalized_feed(user_id, page=page, page_size=page_size)

        dim = len(valid_embs[0])
        center = [sum(e[i] for e in valid_embs) / len(valid_embs) for i in range(dim)]
        center_str = "[" + ",".join(str(v) for v in center) + "]"

        # 获取关注列表
        following_ids_result = await self.db.execute(
            select(UserFollow.following_id).where(UserFollow.follower_id == user_id)
        )
        following_ids = set(str(fid) for fid in following_ids_result.scalars().all())
        following_ids_sql = "'{" + ",".join(following_ids) + "}'" if following_ids else "'{}'::uuid[]"

        fetch_limit = page_size * 8
        offset = (page - 1) * page_size

        advanced_stmt = sa_text(f"""
            SELECT d.id, d.title, d.content, d.dream_date, d.primary_emotion,
                   d.emotion_tags, d.is_seeking_interpretation, d.is_anonymous,
                   d.resonance_count, d.comment_count, d.interpretation_count,
                   d.view_count, d.bookmark_count, d.share_count,
                   d.inspiration_score, d.is_featured, d.user_id, d.created_at,
                   d.anonymous_alias,
                   (1 - (de.content_embedding <=> CAST(:center AS vector))) AS sim_score,
                   CASE WHEN d.user_id = ANY({following_ids_sql}::uuid[]) THEN 1.0 ELSE 0.0 END AS follow_score,
                   COALESCE(d.inspiration_score, 0) / GREATEST(
                       (SELECT MAX(inspiration_score) FROM dreams WHERE privacy_level='PUBLIC'), 1
                   ) AS norm_inspiration,
                   EXP(-0.693 * EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 604800) AS time_decay
            FROM dream_embeddings de
            JOIN dreams d ON d.id = de.dream_id
            WHERE d.privacy_level = 'PUBLIC'
              AND d.deleted_at IS NULL
              AND d.user_id != :user_id
              AND d.id NOT IN (SELECT dream_id FROM resonances WHERE user_id = :user_id)
            ORDER BY (
                0.40 * (1 - (de.content_embedding <=> CAST(:center AS vector)))
                + 0.25 * CASE WHEN d.user_id = ANY({following_ids_sql}::uuid[]) THEN 1.0 ELSE 0.0 END
                + 0.20 * COALESCE(d.inspiration_score, 0) / GREATEST(
                    (SELECT MAX(inspiration_score) FROM dreams WHERE privacy_level='PUBLIC'), 1
                  )
                + 0.15 * EXP(-0.693 * EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 604800)
            ) DESC
            LIMIT :limit OFFSET :offset
        """)
        try:
            result = await self.db.execute(advanced_stmt, {
                "center": center_str,
                "user_id": str(user_id),
                "limit": fetch_limit,
                "offset": offset,
            })
            rows = result.all()
        except Exception:
            return await self.get_personalized_feed(user_id, page=page, page_size=page_size)

        author_ids = list({row.user_id for row in rows})
        author_map: dict[uuid.UUID, User] = {}
        if author_ids:
            for u in (await self.db.execute(select(User).where(User.id.in_(author_ids)))).scalars():
                author_map[u.id] = u

        selected_rows = rows[:page_size]
        counter_map = await self._get_dream_comment_counters_map([row.id for row in selected_rows])

        items = []
        for row in selected_rows:
            author = author_map.get(row.user_id)
            author_brief = None
            if row.is_anonymous:
                alias = row.anonymous_alias or _random_alias(row.id)
                author_brief = UserPublicBrief(id=uuid.UUID(int=0), username=alias, avatar=None, dreamer_title="匿名做梦者", dreamer_level=0)
            elif author:
                author_brief = UserPublicBrief(
                    id=author.id, username=author.username, avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            comment_count, interpretation_count = counter_map.get(row.id, (0, 0))
            items.append(DreamCardSocial(
                id=row.id,
                title=row.title,
                content_preview=row.content[:150] if row.content else "",
                dream_date=str(row.dream_date),
                dream_types=[],
                is_seeking_interpretation=row.is_seeking_interpretation,
                is_anonymous=row.is_anonymous,
                resonance_count=row.resonance_count,
                comment_count=comment_count,
                interpretation_count=interpretation_count,
                view_count=getattr(row, "view_count", 0),
                bookmark_count=getattr(row, "bookmark_count", 0),
                share_count=getattr(row, "share_count", 0),
                has_resonated=False,
                has_bookmarked=False,
                author=author_brief,
                created_at=row.created_at,
            ))

        return FeedResponse(total=len(rows), page=page, page_size=page_size, items=items)

    # ── 精选梦境 ──────────────────────────────────────────────────────────

    def _calc_featured_score(self, dream: Dream) -> float:
        """自动精选分：质量优先 > 互动信号 > 多样性，且可解释。"""
        content = (dream.content or "").strip()
        content_len = len(content)

        # 最低可读阈值：不足 50 字直接不入选
        if content_len < FEATURED_CONFIG.min_content_length:
            return 0.0

        def _cap_linear(value: float, cap: float, full_score: float) -> float:
            if cap <= 0:
                return 0.0
            return min(max(value, 0.0) / cap, 1.0) * full_score

        # 1) 质量（70）
        quality_len_score = _cap_linear(content_len, 400.0, 35.0)
        title_score = 8.0 if (dream.title and dream.title.strip()) else 0.0
        detail_fields = (
            1 if dream.primary_emotion else 0,
            1 if (dream.emotion_tags and len(dream.emotion_tags) > 0) else 0,
            1 if dream.vividness_level else 0,
            1 if dream.completeness_score else 0,
        )
        detail_score = (sum(detail_fields) / len(detail_fields)) * 27.0
        quality_score = quality_len_score + title_score + detail_score

        # 2) 互动（20）
        interaction_score = (
            _cap_linear(dream.resonance_count or 0, 30.0, 7.0)
            + _cap_linear(dream.comment_count or 0, 20.0, 6.0)
            + _cap_linear(dream.interpretation_count or 0, 15.0, 4.0)
            + _cap_linear(dream.bookmark_count or 0, 20.0, 3.0)
        )

        # 3) 多样性（10）
        tag_count = len(dream.emotion_tags) if dream.emotion_tags else 0
        diversity_score = (
            (3.0 if dream.is_seeking_interpretation else 1.5)
            + (2.0 if dream.is_anonymous else 1.5)
            + _cap_linear(tag_count, 6.0, 5.0)
        )

        total = quality_score + interaction_score + diversity_score
        return round(min(total, 100.0), 2)

    def _build_featured_explain(self, dream: Dream, score: float, is_featured: bool) -> str:
        """生成简短可解释原因，写入 featured_reason。"""
        if (dream.content and len(dream.content.strip()) < FEATURED_CONFIG.min_content_length):
            return f"AUTO：内容不足{FEATURED_CONFIG.min_content_length}字，未达最低可读阈值"

        reasons: list[str] = []

        if (dream.content and len(dream.content.strip()) >= 200) or (dream.title and dream.title.strip()):
            reasons.append("内容完整度较高")

        interaction = (dream.resonance_count or 0) + (dream.comment_count or 0) + (dream.interpretation_count or 0) + (dream.bookmark_count or 0)
        if interaction >= 5:
            reasons.append("互动信号积极")

        tag_count = len(dream.emotion_tags) if dream.emotion_tags else 0
        if tag_count >= 3:
            reasons.append("情绪标签较丰富")

        if dream.is_seeking_interpretation:
            reasons.append("存在解读需求")

        if not reasons:
            reasons.append("综合质量达标")

        decision = "入选" if is_featured else "未入选"
        return f"AUTO：{decision}（得分 {score:.2f}/{FEATURED_CONFIG.auto_threshold:.0f}）- {'，'.join(reasons[:3])}"

    async def refresh_featured_snapshot(self, dream_id: uuid.UUID) -> float | None:
        dream = await self.db.get(Dream, dream_id)
        if not dream:
            return None

        score = self._calc_featured_score(dream)

        if dream.feature_mode == FEATURE_MODE_FORCE_OFF:
            is_featured = False
            reason = "FORCE_OFF：管理员强制不精选"
        elif dream.feature_mode == FEATURE_MODE_FORCE_ON:
            is_featured = True
            reason = "FORCE_ON：管理员强制精选"
        else:
            is_featured = score >= FEATURED_CONFIG.auto_threshold
            reason = self._build_featured_explain(dream, score, is_featured)

        await self.db.execute(
            update(Dream)
            .where(Dream.id == dream_id)
            .values(
                featured_score_snapshot=score,
                is_featured=is_featured,
                featured_reason=reason,
            )
        )
        await self.db.flush()
        return score

    async def feature_dream(
        self,
        dream_id: uuid.UUID,
        *,
        feature_mode: str = FEATURE_MODE_AUTO,
        featured_reason: str | None = None,
        featured_updated_by: uuid.UUID | None = None,
    ) -> bool:
        """管理员设置精选模式：AUTO / FORCE_ON / FORCE_OFF"""
        dream = await self.db.get(Dream, dream_id)
        if not dream:
            return False

        mode = (feature_mode or FEATURE_MODE_AUTO).upper()
        if mode not in {FEATURE_MODE_AUTO, FEATURE_MODE_FORCE_ON, FEATURE_MODE_FORCE_OFF}:
            raise ValueError("无效的 feature_mode")

        await self.db.execute(
            update(Dream)
            .where(Dream.id == dream_id)
            .values(
                feature_mode=mode,
                featured_reason=featured_reason,
                featured_updated_by=featured_updated_by,
            )
        )

        score = await self.refresh_featured_snapshot(dream_id)
        await recalculate_dream_heat(self.db, dream_id)
        await self._recalculate_inspiration_score(dream_id)

        if mode == FEATURE_MODE_FORCE_ON and not dream.is_featured:
            await self._award_points(dream.user_id, "featured")
        elif mode == FEATURE_MODE_AUTO and (score or 0) >= FEATURED_CONFIG.auto_threshold and not dream.is_featured:
            await self._award_points(dream.user_id, "featured")

        await self.db.flush()
        return True

    async def recompute_recent_auto_featured(
        self,
        *,
        days: int | None = None,
        batch_size: int | None = None,
    ) -> dict[str, int]:
        """批量重算最近 N 天 AUTO 梦境的精选快照（轻量任务）。"""
        effective_days = max(1, days or FEATURED_CONFIG.recalc_window_days)
        effective_batch_size = max(1, batch_size or FEATURED_CONFIG.recalc_batch_size)
        cutoff = datetime.now(timezone.utc) - timedelta(days=effective_days)

        stmt = (
            select(Dream.id)
            .where(
                Dream.privacy_level == PrivacyLevel.PUBLIC,
                Dream.deleted_at.is_(None),
                Dream.feature_mode == FEATURE_MODE_AUTO,
                Dream.created_at >= cutoff,
            )
            .order_by(desc(Dream.created_at))
            .limit(effective_batch_size)
        )
        dream_ids = (await self.db.execute(stmt)).scalars().all()

        processed = 0
        changed = 0
        featured = 0

        for dream_id in dream_ids:
            dream_before = await self.db.get(Dream, dream_id)
            if not dream_before:
                continue
            was_featured = bool(dream_before.is_featured)

            await self.refresh_featured_snapshot(dream_id)

            dream_after = await self.db.get(Dream, dream_id)
            if not dream_after:
                continue
            is_featured = bool(dream_after.is_featured)

            processed += 1
            if is_featured:
                featured += 1
            if was_featured != is_featured:
                changed += 1

        await self.db.flush()
        return {
            "processed": processed,
            "changed": changed,
            "featured": featured,
        }

    # ── 收藏 ────────────────────────────────────────────────────────────

    async def toggle_bookmark(self, dream_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stmt = select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.dream_id == dream_id)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            await self.db.delete(existing)
            await self.db.execute(
                update(Dream).where(Dream.id == dream_id).values(bookmark_count=func.greatest(0, Dream.bookmark_count - 1))
            )
            await recalculate_dream_heat(self.db, dream_id)
            await self.db.flush()
            return False
        self.db.add(Bookmark(user_id=user_id, dream_id=dream_id))
        await self.db.execute(
            update(Dream).where(Dream.id == dream_id).values(bookmark_count=Dream.bookmark_count + 1)
        )
        await recalculate_dream_heat(self.db, dream_id)
        await self.db.flush()
        return True

    async def get_bookmarks(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> FeedResponse:
        subq = select(Bookmark.dream_id).where(Bookmark.user_id == user_id)
        base = select(Dream).where(Dream.id.in_(subq), Dream.deleted_at.is_(None)).order_by(desc(Dream.created_at))

        total = (await self.db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
        offset = (page - 1) * page_size
        result = await self.db.execute(base.offset(offset).limit(page_size))
        dreams = result.scalars().all()

        author_ids = list({d.user_id for d in dreams})
        author_map: dict[uuid.UUID, User] = {}
        if author_ids:
            for u in (await self.db.execute(select(User).where(User.id.in_(author_ids)))).scalars():
                author_map[u.id] = u

        items = []
        for dream in dreams:
            author = author_map.get(dream.user_id)
            author_brief = None
            if author:
                author_brief = UserPublicBrief(
                    id=author.id,
                    username=author.username,
                    avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            comment_count, interpretation_count = counter_map.get(dream.id, (0, 0))
            items.append(DreamCardSocial(
                id=dream.id,
                title=dream.title,
                content_preview=dream.content[:150],
                dream_date=str(dream.dream_date),
                dream_types=[],
                is_seeking_interpretation=dream.is_seeking_interpretation,
                is_anonymous=dream.is_anonymous,
                resonance_count=dream.resonance_count,
                comment_count=comment_count,
                interpretation_count=interpretation_count,
                view_count=dream.view_count,
                bookmark_count=dream.bookmark_count,
                share_count=getattr(dream, "share_count", 0),
                has_resonated=False,
                has_bookmarked=True,
                author=author_brief,
                created_at=dream.created_at,
            ))
        return FeedResponse(total=total, page=page, page_size=page_size, items=items)

    # ── 举报 ────────────────────────────────────────────────────────────

    async def create_report(self, reporter_id: uuid.UUID, target_type: str, target_id: uuid.UUID, reason: str, description: str | None) -> Report:
        report = Report(
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            description=description,
        )
        self.db.add(report)
        await self.db.flush()
        return report

    # ── 发现 ────────────────────────────────────────────────────────────

    async def get_trending_tags(self, limit: int = 10) -> list[TrendingTag]:
        """热门标签（基于最近7天公开梦境的情绪标签）"""
        from sqlalchemy import text as sa_text
        stmt = sa_text("""
            SELECT tag, count(*) as cnt
            FROM dreams, jsonb_array_elements_text(emotion_tags) AS tag
            WHERE privacy_level = 'PUBLIC' AND deleted_at IS NULL
            AND created_at > NOW() - INTERVAL '7 days'
            GROUP BY tag ORDER BY cnt DESC LIMIT :limit
        """)
        result = await self.db.execute(stmt, {"limit": limit})
        return [TrendingTag(name=row.tag, count=row.cnt) for row in result.all()]

    async def get_active_interpreters(self, limit: int = 5) -> list[ActiveInterpreter]:
        """活跃解读者榜单"""
        stmt = (
            select(User)
            .where(User.interpretation_count > 0)
            .order_by(desc(User.interpretation_count))
            .limit(limit)
        )
        users = (await self.db.execute(stmt)).scalars().all()
        return [
            ActiveInterpreter(
                id=u.id,
                username=u.username,
                avatar=u.avatar,
                interpretation_count=getattr(u, "interpretation_count", 0),
                dreamer_level=getattr(u, "dreamer_level", 1),
            )
            for u in users
        ]

    # ── 梦境社群 ──────────────────────────────────────────────────────────

    async def get_communities(
        self, current_user_id: uuid.UUID | None = None
    ) -> CommunityListResponse:
        """获取所有社群列表（含当前用户是否已加入）"""
        stmt = select(Community).order_by(Community.sort_order, Community.created_at)
        communities = (await self.db.execute(stmt)).scalars().all()

        # 批量查询当前用户的加入状态
        joined_ids: set[uuid.UUID] = set()
        if current_user_id and communities:
            community_ids = [c.id for c in communities]
            joined_stmt = select(CommunityMember.community_id).where(
                CommunityMember.user_id == current_user_id,
                CommunityMember.community_id.in_(community_ids),
            )
            joined_ids = set((await self.db.execute(joined_stmt)).scalars().all())

        items = [
            CommunityResponse(
                id=c.id,
                name=c.name,
                slug=c.slug,
                description=c.description,
                icon=c.icon,
                cover_image=c.cover_image,
                member_count=c.member_count,
                post_count=c.post_count,
                is_official=c.is_official,
                sort_order=c.sort_order,
                created_at=c.created_at,
                is_member=c.id in joined_ids,
            )
            for c in communities
        ]
        return CommunityListResponse(total=len(items), items=items)

    async def get_community_by_slug(
        self, slug: str, current_user_id: uuid.UUID | None = None
    ) -> CommunityResponse | None:
        """按 slug 获取社群详情"""
        stmt = select(Community).where(Community.slug == slug)
        community = (await self.db.execute(stmt)).scalar_one_or_none()
        if not community:
            return None

        is_member = False
        if current_user_id:
            mem_stmt = select(exists().where(
                CommunityMember.user_id == current_user_id,
                CommunityMember.community_id == community.id,
            ))
            is_member = bool((await self.db.execute(mem_stmt)).scalar())

        return CommunityResponse(
            id=community.id,
            name=community.name,
            slug=community.slug,
            description=community.description,
            icon=community.icon,
            cover_image=community.cover_image,
            member_count=community.member_count,
            post_count=community.post_count,
            is_official=community.is_official,
            sort_order=community.sort_order,
            created_at=community.created_at,
            is_member=is_member,
        )

    async def join_community(
        self, slug: str, user_id: uuid.UUID
    ) -> CommunityJoinResponse:
        """加入/退出社群，返回最新状态"""
        stmt = select(Community).where(Community.slug == slug)
        community = (await self.db.execute(stmt)).scalar_one_or_none()
        if not community:
            raise ValueError("社群不存在")

        mem_stmt = select(CommunityMember).where(
            CommunityMember.user_id == user_id,
            CommunityMember.community_id == community.id,
        )
        existing = (await self.db.execute(mem_stmt)).scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            new_count = max(0, community.member_count - 1)
            joined = False
        else:
            self.db.add(CommunityMember(user_id=user_id, community_id=community.id))
            new_count = community.member_count + 1
            joined = True

        await self.db.execute(
            update(Community).where(Community.id == community.id).values(member_count=new_count)
        )
        await self.db.flush()
        return CommunityJoinResponse(
            community_id=community.id, joined=joined, member_count=new_count
        )

    async def get_community_feed(
        self,
        slug: str,
        *,
        sort: str = "latest",
        current_user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> FeedResponse:
        """获取指定社群的梦境流"""
        comm_stmt = select(Community).where(Community.slug == slug)
        community = (await self.db.execute(comm_stmt)).scalar_one_or_none()
        if not community:
            raise ValueError("社群不存在")

        return await self.get_feed(
            channel="greenhouse",
            sort=sort,
            current_user_id=current_user_id,
            page=page,
            page_size=page_size,
        )

    async def get_similar_dreamers(
        self, user_id: uuid.UUID, limit: int = 5
    ) -> list[SimilarDreamer]:
        """根据梦境标签推荐相似做梦者"""
        from sqlalchemy import text as sa_text

        # 找出当前用户的常用情绪标签
        user_tags_stmt = sa_text("""
            SELECT tag FROM dreams, jsonb_array_elements_text(emotion_tags) AS tag
            WHERE user_id = :user_id AND deleted_at IS NULL
            GROUP BY tag ORDER BY count(*) DESC LIMIT 10
        """)
        user_tags_result = await self.db.execute(user_tags_stmt, {"user_id": str(user_id)})
        user_tags = [row.tag for row in user_tags_result.all()]

        if not user_tags:
            # 没有标签时返回活跃用户
            stmt = (
                select(User)
                .where(User.id != user_id, User.public_dream_count > 0)
                .order_by(desc(User.public_dream_count))
                .limit(limit)
            )
            users = (await self.db.execute(stmt)).scalars().all()
            return [
                SimilarDreamer(
                    id=u.id,
                    username=u.username,
                    avatar=u.avatar,
                    dreamer_level=getattr(u, "dreamer_level", 1),
                    common_tags=[],
                )
                for u in users
            ]

        # 找出拥有相似标签的用户
        similar_stmt = sa_text("""
            SELECT u.id, u.username, u.avatar,
                   COALESCE(u.dreamer_level, 1) as dreamer_level,
                   array_agg(DISTINCT tag) as common_tags,
                   count(DISTINCT tag) as tag_overlap
            FROM users u
            JOIN dreams d ON d.user_id = u.id
            JOIN jsonb_array_elements_text(d.emotion_tags) AS tag ON tag = ANY(:tags)
            WHERE u.id != :user_id AND d.deleted_at IS NULL AND d.privacy_level = 'PUBLIC'
            GROUP BY u.id, u.username, u.avatar, u.dreamer_level
            ORDER BY tag_overlap DESC, u.public_dream_count DESC
            LIMIT :limit
        """)
        result = await self.db.execute(similar_stmt, {
            "user_id": str(user_id),
            "tags": user_tags,
            "limit": limit,
        })
        return [
            SimilarDreamer(
                id=row.id,
                username=row.username,
                avatar=row.avatar,
                dreamer_level=row.dreamer_level,
                common_tags=list(row.common_tags or []),
            )
            for row in result.all()
        ]

    async def get_explore_data(
        self, current_user_id: uuid.UUID | None = None
    ) -> ExploreResponse:
        """汇总发现页所有数据"""
        trending_tags = await self.get_trending_tags(10)
        active_interpreters = await self.get_active_interpreters(5)
        communities_result = await self.get_communities(current_user_id)
        recommended = communities_result.items[:4]

        similar_dreamers: list[SimilarDreamer] = []
        if current_user_id:
            try:
                similar_dreamers = await self.get_similar_dreamers(current_user_id, 5)
            except Exception:
                pass

        return ExploreResponse(
            trending_tags=trending_tags,
            active_interpreters=active_interpreters,
            recommended_communities=recommended,
            similar_dreamers=similar_dreamers,
        )

    # ── 搜索 ──────────────────────────────────────────────────────────────────

    async def search(
        self,
        *,
        query: str,
        search_type: str = "all",      # all | dreams | users | tags
        channel: str = "plaza",         # plaza | roundtable | greenhouse | museum
        sort: str = "relevant",         # relevant | latest | hot
        page: int = 1,
        page_size: int = 20,
        current_user_id: uuid.UUID | None = None,
    ) -> SearchResponse:
        """统一搜索入口：梦境 + 用户 + 标签"""
        q = query.strip()

        dreams: list[DreamCardSocial] = []
        total_dreams = 0
        users: list[UserSearchResult] = []
        total_users = 0
        tags: list[str] = []

        if search_type in ("all", "dreams"):
            dreams, total_dreams = await self._search_dreams(
                q, channel=channel, sort=sort,
                page=page, page_size=page_size, current_user_id=current_user_id,
            )

        if search_type in ("all", "users"):
            user_page_size = 3 if search_type == "all" else page_size
            users, total_users = await self._search_users(
                q, page=1 if search_type == "all" else page,
                page_size=user_page_size,
                current_user_id=current_user_id,
            )

        if search_type in ("all", "tags"):
            tags = await self._search_tags(q)

        return SearchResponse(
            query=q,
            total_dreams=total_dreams,
            total_users=total_users,
            dreams=dreams,
            users=users,
            tags=tags,
            page=page,
            page_size=page_size,
        )

    async def _search_dreams(
        self,
        query: str,
        *,
        channel: str = "plaza",
        sort: str = "relevant",
        page: int = 1,
        page_size: int = 20,
        current_user_id: uuid.UUID | None = None,
    ) -> tuple[list[DreamCardSocial], int]:
        """梦境全文搜索（ilike + pg_trgm 索引加速）"""
        pattern = f"%{query}%"

        base = select(Dream).where(
            Dream.privacy_level == PrivacyLevel.PUBLIC,
            Dream.deleted_at.is_(None),
            or_(
                Dream.title.ilike(pattern),
                Dream.content.ilike(pattern),
            ),
        )

        # 频道过滤
        if channel == "roundtable":
            base = base.where(Dream.is_seeking_interpretation.is_(True))
        elif channel == "greenhouse":
            base = base.where(Dream.community_id.isnot(None))
        elif channel == "museum":
            base = base.where(
                or_(
                    Dream.feature_mode == FEATURE_MODE_FORCE_ON,
                    and_(
                        Dream.feature_mode == FEATURE_MODE_AUTO,
                        Dream.featured_score_snapshot >= AUTO_FEATURED_THRESHOLD,
                    ),
                )
            )

        # 排序
        if sort == "hot":
            base = base.order_by(desc(Dream.heat_score), desc(Dream.created_at))
        elif sort == "latest":
            base = base.order_by(desc(Dream.created_at))
        else:
            # relevant：标题含关键词的排前面，其次按共鸣数、时间
            title_matches = case((Dream.title.ilike(pattern), 1), else_=0)
            base = base.order_by(desc(title_matches), desc(Dream.resonance_count), desc(Dream.created_at))

        # 总数（最多计数到 1000 以避免全扫描）
        count_subq = base.limit(1000).subquery()
        count_stmt = select(func.count()).select_from(count_subq)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        stmt = base.offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        dreams = result.scalars().all()

        # 批量查询共鸣/收藏状态
        resonated_ids: set[uuid.UUID] = set()
        bookmarked_ids: set[uuid.UUID] = set()
        if current_user_id and dreams:
            dream_ids = [d.id for d in dreams]
            res_stmt = select(Resonance.dream_id).where(
                Resonance.user_id == current_user_id,
                Resonance.dream_id.in_(dream_ids),
            )
            resonated_ids = set((await self.db.execute(res_stmt)).scalars().all())
            bm_stmt = select(Bookmark.dream_id).where(
                Bookmark.user_id == current_user_id,
                Bookmark.dream_id.in_(dream_ids),
            )
            bookmarked_ids = set((await self.db.execute(bm_stmt)).scalars().all())

        # 批量查询作者
        author_ids = list({d.user_id for d in dreams})
        author_map: dict[uuid.UUID, User] = {}
        if author_ids:
            users_result = await self.db.execute(select(User).where(User.id.in_(author_ids)))
            for u in users_result.scalars().all():
                author_map[u.id] = u

        counter_map = await self._get_dream_comment_counters_map([d.id for d in dreams])

        items = []
        for dream in dreams:
            author = author_map.get(dream.user_id)
            author_brief = None
            if author and not dream.is_anonymous:
                author_brief = UserPublicBrief(
                    id=author.id,
                    username=author.username,
                    avatar=author.avatar,
                    dreamer_title=getattr(author, "dreamer_title", "做梦者"),
                    dreamer_level=getattr(author, "dreamer_level", 1),
                )
            elif dream.is_anonymous:
                alias = dream.anonymous_alias or _random_alias(dream.id)
                author_brief = UserPublicBrief(
                    id=uuid.UUID(int=0),
                    username=alias,
                    avatar=None,
                    dreamer_title="匿名做梦者",
                    dreamer_level=0,
                )

            comment_count, interpretation_count = counter_map.get(dream.id, (0, 0))
            items.append(DreamCardSocial(
                id=dream.id,
                title=dream.title,
                content_preview=dream.content[:200] if dream.content else "",
                dream_date=str(dream.dream_date),
                dream_types=[],
                is_seeking_interpretation=dream.is_seeking_interpretation or False,
                is_anonymous=dream.is_anonymous or False,
                resonance_count=dream.resonance_count or 0,
                comment_count=comment_count,
                interpretation_count=interpretation_count,
                view_count=dream.view_count or 0,
                bookmark_count=dream.bookmark_count or 0,
                share_count=getattr(dream, "share_count", 0) or 0,
                has_resonated=dream.id in resonated_ids,
                has_bookmarked=dream.id in bookmarked_ids,
                author=author_brief,
                created_at=dream.created_at,
            ))

        return items, total

    async def _search_users(
        self,
        query: str,
        *,
        page: int = 1,
        page_size: int = 20,
        current_user_id: uuid.UUID | None = None,
    ) -> tuple[list[UserSearchResult], int]:
        """用户名搜索（ilike + pg_trgm 索引加速）"""
        pattern = f"%{query}%"

        base = select(User).where(User.username.ilike(pattern))
        count_subq = base.limit(1000).subquery()
        count_stmt = select(func.count()).select_from(count_subq)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = base.order_by(desc(User.follower_count)).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        users = result.scalars().all()

        # 批量查询关注状态
        following_ids: set[uuid.UUID] = set()
        if current_user_id and users:
            user_ids = [u.id for u in users]
            follow_stmt = select(UserFollow.following_id).where(
                UserFollow.follower_id == current_user_id,
                UserFollow.following_id.in_(user_ids),
            )
            following_ids = set((await self.db.execute(follow_stmt)).scalars().all())

        return [
            UserSearchResult(
                id=u.id,
                username=u.username,
                avatar=u.avatar,
                bio=getattr(u, "bio", None),
                dreamer_title=getattr(u, "dreamer_title", "做梦者"),
                dreamer_level=getattr(u, "dreamer_level", 1),
                inspiration_points=getattr(u, "inspiration_points", 0),
                follower_count=getattr(u, "follower_count", 0),
                is_following=u.id in following_ids,
            )
            for u in users
        ], total

    async def _search_tags(self, query: str, limit: int = 20) -> list[str]:
        """从 emotion_tags JSONB 中搜索包含关键词的标签"""
        stmt = (
            select(func.jsonb_array_elements_text(Dream.emotion_tags).label("tag"))
            .where(
                Dream.privacy_level == PrivacyLevel.PUBLIC,
                Dream.deleted_at.is_(None),
                Dream.emotion_tags.isnot(None),
            )
            .distinct()
        )
        result = await self.db.execute(stmt)
        all_tags = [row.tag for row in result.all() if query.lower() in row.tag.lower()]
        return all_tags[:limit]

    async def get_search_suggestions(self, query: str, limit: int = 5) -> list[str]:
        """搜索建议：返回匹配的热门情绪标签"""
        return await self._search_tags(query, limit=limit)

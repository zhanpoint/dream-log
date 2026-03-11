"""
社区 API 路由
"""

import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.notification import NotificationType
from app.models.dream import Dream
from app.models.user import User
from app.schemas.community import (
    BookmarkResponse,
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentVoteRequest,
    CommentVoteResponse,
    CommunityCreationApplicationCreate,
    CommunityCreationApplicationResponse,
    CommunityJoinResponse,
    CommunityListResponse,
    CommunityResponse,
    DreamCardSocial,
    ExploreResponse,
    FeatureDreamRequest,
    FeedResponse,
    FollowResponse,
    ReportCreate,
    ResonanceResponse,
    SearchResponse,
    TrendingResponse,
    UserAssetsMetaResponse,
    UserAssetsResponse,
    UserPublicProfile,
    TrendingTag,
    ActiveInterpreter,
    CommunitySidebarResponse,
    CommunityOverviewResponse,
)
from app.services.community_service import CommunityService
from app.services.notification_service import NotificationService
from app.services.trending_service import TrendingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["社区"])

# ── 可选认证依赖 ──────────────────────────────────────────────────────────────

from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.services.token_service import TokenService
from app.services.user_service import UserService

_optional_bearer = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = TokenService.verify_token(credentials.credentials, token_type="access")
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await UserService(db).get_by_id(user_id)
    except Exception:
        return None


# ── 社区梦境动态流 ─────────────────────────────────────────────────────────────

@router.get("/feed", response_model=FeedResponse, summary="社区梦境动态流")
async def get_feed(
    channel: str = Query(
        "plaza",
        description="plaza(梦境广场) | roundtable(解梦求助) | greenhouse(梦境社群) | museum(精选梦境)",
    ),
    sort: str = Query("latest", description="latest | resonating | following | foryou"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_feed(
        channel=channel,
        sort=sort,
        current_user_id=current_user.id if current_user else None,
        page=page,
        page_size=page_size,
    )


# ── 单个梦境详情 ───────────────────────────────────────────────────────────────

@router.get("/dreams/{dream_id}", response_model=DreamCardSocial, summary="获取单个公开梦境")
async def get_dream_detail(
    dream_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    dream = await svc.get_dream_detail(
        dream_id, current_user_id=current_user.id if current_user else None
    )
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在或未公开")
    return dream


@router.post("/dreams/{dream_id}/view", summary="记录社区梦境详情浏览")
async def increment_dream_view(
    dream_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """公开梦境详情页被打开时调用，浏览数 +1；同一会话内由前端控制只请求一次。"""
    svc = CommunityService(db)
    view_count = await svc.increment_dream_view(dream_id)
    if view_count is None:
        raise HTTPException(status_code=404, detail="梦境不存在或未公开")
    return {"view_count": view_count}


@router.post("/dreams/{dream_id}/share", summary="记录社区梦境分享")
async def increment_dream_share(
    dream_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """用户点击分享时调用，分享数 +1。"""
    svc = CommunityService(db)
    share_count = await svc.increment_dream_share(dream_id)
    if share_count is None:
        raise HTTPException(status_code=404, detail="梦境不存在或未公开")
    return {"share_count": share_count}


# ── 共鸣 ──────────────────────────────────────────────────────────────────────

@router.post("/dreams/{dream_id}/resonate", response_model=ResonanceResponse, summary="切换共鸣")
async def toggle_resonate(
    dream_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        resonated, count = await svc.toggle_resonance(dream_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # 共鸣通知（异步，不阻塞响应）
    if resonated:
        try:
            from app.models.dream import Dream
            dream = await db.get(Dream, dream_id)
            if dream and dream.user_id != current_user.id:
                notif_svc = NotificationService(db)
                await notif_svc.create(
                    user_id=dream.user_id,
                    type_=NotificationType.RESONANCE,
                    title="有人共鸣了你的梦境",
                    content=f"{current_user.username or '某人'} 对你的梦境产生了共鸣",
                    link=f"/community/dream/{dream_id}",
                    metadata={"dream_id": str(dream_id), "user_id": str(current_user.id)},
                )
        except Exception as e:
            logger.warning(f"共鸣通知发送失败: {e}")

    return ResonanceResponse(dream_id=dream_id, resonated=resonated, resonance_count=count)


# ── 评论 ──────────────────────────────────────────────────────────────────────

@router.get("/dreams/{dream_id}/comments", response_model=CommentListResponse, summary="获取评论列表（支持按 parent_id 取回复）")
async def get_comments(
    dream_id: uuid.UUID,
    is_interpretation: bool | None = Query(None),
    parent_id: uuid.UUID | None = Query(None, description="指定则返回该评论的回复列表"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_comments(
        dream_id,
        is_interpretation=is_interpretation,
        parent_id=parent_id,
        current_user_id=current_user.id if current_user else None,
        limit=limit,
        offset=offset,
    )


@router.post("/dreams/{dream_id}/comments", response_model=CommentResponse, status_code=201, summary="发表评论/解读")
async def create_comment(
    dream_id: uuid.UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        comment = await svc.create_comment(dream_id, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 通知梦境作者
    try:
        from app.models.dream import Dream
        dream = await db.get(Dream, dream_id)
        if dream and dream.user_id != current_user.id:
            notif_svc = NotificationService(db)
            notif_type = NotificationType.INTERPRETATION if data.is_interpretation else NotificationType.COMMENT
            title = "有人解读了你的梦境" if data.is_interpretation else "有人评论了你的梦境"
            await notif_svc.create(
                user_id=dream.user_id,
                type_=notif_type,
                title=title,
                content=f"{current_user.username or '某人'}: {data.content[:50]}",
                link=f"/community/dream/{dream_id}",
                metadata={"dream_id": str(dream_id), "comment_id": str(comment.id)},
            )
    except Exception as e:
        logger.warning(f"评论通知发送失败: {e}")

    from app.schemas.community import CommentAuthor
    author = CommentAuthor(
        id=current_user.id,
        username=current_user.username,
        avatar=current_user.avatar,
        dreamer_level=getattr(current_user, "dreamer_level", 1),
    )
    return CommentResponse(
        id=comment.id,
        dream_id=comment.dream_id,
        content=comment.content,
        is_interpretation=comment.is_interpretation,
        is_adopted=comment.is_adopted,
        like_count=comment.like_count,
        inspire_count=comment.inspire_count,
        is_anonymous=comment.is_anonymous,
        has_liked=False,
        author=author,
        parent_id=comment.parent_id,
        reply_count=0,
        created_at=comment.created_at,
    )


@router.delete("/comments/{comment_id}", status_code=204, summary="删除评论")
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    ok = await svc.delete_comment(comment_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="评论不存在或无权限")


@router.post("/comments/{comment_id}/vote", summary="评论赞同/反对（与梦境共鸣无关）")
async def comment_vote(
    comment_id: uuid.UUID,
    body: CommentVoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        vote, up_count, down_count = await svc.set_comment_vote(
            comment_id, current_user.id, body.vote if body.vote in ("up", "down") else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CommentVoteResponse(vote=vote, up_count=up_count, down_count=down_count)


@router.post("/comments/{comment_id}/adopt", summary="采纳解读")
async def adopt_interpretation(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    ok = await svc.adopt_interpretation(comment_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=400, detail="采纳失败：不是解读或无权限")

    # 通知解读者
    try:
        from app.models.community import Comment
        from sqlalchemy import select
        comment = (await db.execute(select(Comment).where(Comment.id == comment_id))).scalar_one_or_none()
        if comment and comment.user_id != current_user.id:
            notif_svc = NotificationService(db)
            await notif_svc.create(
                user_id=comment.user_id,
                type_=NotificationType.INTERPRETATION_ADOPTED,
                title="你的解读被采纳了！",
                content=f"{current_user.username or '梦境作者'} 采纳了你的解读",
                link=f"/community/dream/{comment.dream_id}",
                metadata={"comment_id": str(comment_id), "dream_id": str(comment.dream_id)},
            )
    except Exception as e:
        logger.warning(f"采纳通知发送失败: {e}")

    return {"adopted": True}


# ── 关注 ──────────────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/follow", response_model=FollowResponse, summary="切换关注")
async def toggle_follow(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        following, follower_count = await svc.toggle_follow(current_user.id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 关注通知
    if following:
        try:
            notif_svc = NotificationService(db)
            await notif_svc.create(
                user_id=user_id,
                type_=NotificationType.NEW_FOLLOWER,
                title="有新人关注了你",
                content=f"{current_user.username or '某人'} 开始关注你",
                link=f"/community/user/{current_user.id}",
                metadata={"follower_id": str(current_user.id)},
            )
        except Exception as e:
            logger.warning(f"关注通知发送失败: {e}")

    return FollowResponse(user_id=user_id, following=following, follower_count=follower_count)


# ── 用户主页 ──────────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/profile", response_model=UserPublicProfile, summary="用户公开主页")
async def get_user_profile(
    user_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    profile = await svc.get_user_profile(user_id, current_user.id if current_user else None)
    if not profile:
        raise HTTPException(status_code=404, detail="用户不存在")
    return profile


@router.get("/users/{user_id}/dreams", response_model=FeedResponse, summary="用户公开梦境列表")
async def get_user_dreams(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_user_public_dreams(
        user_id,
        current_user_id=current_user.id if current_user else None,
        page=page,
        page_size=page_size,
    )


# ── 收藏 ──────────────────────────────────────────────────────────────────────

@router.post("/dreams/{dream_id}/bookmark", response_model=BookmarkResponse, summary="切换收藏")
async def toggle_bookmark(
    dream_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    bookmarked = await svc.toggle_bookmark(dream_id, current_user.id)
    return BookmarkResponse(dream_id=dream_id, bookmarked=bookmarked)


@router.get("/bookmarks", response_model=FeedResponse, summary="我的收藏列表")
async def get_bookmarks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_bookmarks(
        current_user.id,
        current_user_id=current_user.id,
        page=page,
        page_size=page_size,
    )


# ── 举报 ──────────────────────────────────────────────────────────────────────

@router.post("/report", status_code=201, summary="举报内容")
async def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    await svc.create_report(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
    )
    return {"success": True, "message": "举报已提交，我们将尽快处理"}


# ── 发现 ──────────────────────────────────────────────────────────────────────

@router.get("/explore/trending-tags", response_model=list[TrendingTag], summary="热门标签")
async def get_trending_tags(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_trending_tags(limit)


@router.get("/explore/active-interpreters", response_model=list[ActiveInterpreter], summary="活跃解读者")
async def get_active_interpreters(
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_active_interpreters(limit)


@router.get("/explore", response_model=ExploreResponse, summary="发现页汇总数据")
async def get_explore(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_explore_data(
        current_user_id=current_user.id if current_user else None
    )


# ── 梦境社群 ───────────────────────────────────────────────────────────────────

@router.get("/communities", response_model=CommunityListResponse, summary="社群列表")
async def get_communities(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    return await svc.get_communities(
        current_user_id=current_user.id if current_user else None
    )


@router.get("/communities/{slug}", response_model=CommunityResponse, summary="社群详情")
async def get_community(
    slug: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    community = await svc.get_community_by_slug(
        slug, current_user_id=current_user.id if current_user else None
    )
    if not community:
        raise HTTPException(status_code=404, detail="社群不存在")
    return community


@router.get("/communities/{slug}/feed", response_model=FeedResponse, summary="社群梦境流")
async def get_community_feed(
    slug: str,
    sort: str = Query("latest", description="latest | resonating"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        return await svc.get_community_feed(
            slug,
            sort=sort,
            current_user_id=current_user.id if current_user else None,
            page=page,
            page_size=page_size,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/communities/{slug}/join", response_model=CommunityJoinResponse, summary="加入/退出社群")
async def join_community(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        return await svc.join_community(slug, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/communities/applications",
    response_model=CommunityCreationApplicationResponse,
    status_code=201,
    summary="申请创建社群（轻表单）",
)
async def create_community_application(
    data: CommunityCreationApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        application = await svc.create_community_application(
            applicant_id=current_user.id,
            name=data.name,
            description=data.description,
            motivation=data.motivation,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()
    await db.refresh(application)
    return application


@router.post(
    "/communities/applications/{application_id}/review",
    response_model=CommunityCreationApplicationResponse,
    summary="审核社群创建申请（管理员）",
)
async def review_community_application(
    application_id: uuid.UUID,
    approved: bool = Query(..., description="true=通过并上线，false=驳回"),
    review_note: str | None = Query(None, max_length=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not getattr(current_user, "is_superuser", False):
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    svc = CommunityService(db)
    try:
        application = await svc.review_community_application(
            application_id=application_id,
            reviewer_id=current_user.id,
            approved=approved,
            review_note=review_note,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()
    await db.refresh(application)
    return application


@router.get(
    "/greenhouse/sidebar",
    response_model=CommunitySidebarResponse,
    summary="社群三栏壳层左栏数据",
)
async def get_greenhouse_sidebar(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    data = await svc.get_community_shell_sidebar(
        current_user_id=current_user.id if current_user else None
    )
    return data


@router.get(
    "/greenhouse/{slug}/overview",
    response_model=CommunityOverviewResponse,
    summary="社群三栏壳层右栏概览",
)
async def get_greenhouse_overview(
    slug: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        return await svc.get_community_overview(
            slug=slug,
            current_user_id=current_user.id if current_user else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/users/{user_id}/assets/meta", response_model=UserAssetsMetaResponse, summary="用户社区资产元信息")
async def get_user_assets_meta(
    user_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        return await svc.get_user_assets_meta(
            user_id,
            viewer_user_id=current_user.id if current_user else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/users/{user_id}/assets", response_model=UserAssetsResponse, summary="用户社区资产")
async def get_user_assets(
    user_id: uuid.UUID,
    kind: str = Query("all", description="all | public | bookmarks | created | joined"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    svc = CommunityService(db)
    try:
        data = await svc.get_user_assets(
            user_id,
            viewer_user_id=current_user.id if current_user else None,
        )
        if kind == "public":
            data["bookmarked_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["created_communities"] = []
            data["joined_communities"] = []
        elif kind == "bookmarks":
            data["public_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["created_communities"] = []
            data["joined_communities"] = []
        elif kind == "created":
            data["public_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["bookmarked_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["joined_communities"] = []
        elif kind == "joined":
            data["public_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["bookmarked_dreams"] = FeedResponse(total=0, page=1, page_size=20, items=[])
            data["created_communities"] = []
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── 精选梦境（管理员） ───────────────────────────────────────────────────────────

@router.post("/dreams/{dream_id}/feature", summary="设置精选模式（管理员）")
async def feature_dream(
    dream_id: uuid.UUID,
    body: FeatureDreamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not getattr(current_user, "is_superuser", False):
        raise HTTPException(status_code=403, detail="仅管理员可操作")
    svc = CommunityService(db)
    try:
      ok = await svc.feature_dream(
          dream_id,
          feature_mode=body.feature_mode,
          featured_reason=body.featured_reason,
          featured_updated_by=current_user.id,
      )
    except ValueError as e:
      raise HTTPException(status_code=400, detail=str(e))

    if not ok:
        raise HTTPException(status_code=404, detail="梦境不存在")

    score = await svc.refresh_featured_snapshot(dream_id)
    await db.commit()

    dream = await db.get(Dream, dream_id)
    return {
        "dream_id": dream_id,
        "feature_mode": getattr(dream, "feature_mode", "AUTO"),
        "is_featured": getattr(dream, "is_featured", False),
        "featured_score_snapshot": score,
    }


# ── 搜索 ───────────────────────────────────────────────────────────────────────

@router.get("/search", response_model=SearchResponse, summary="社区统一搜索")
async def search_community(
    q: str = Query(..., min_length=2, max_length=100, description="搜索关键词（至少2个字符）"),
    type: str = Query("all", description="all | dreams | users | tags"),
    channel: str = Query("plaza", description="plaza | roundtable | greenhouse | museum"),
    sort: str = Query("relevant", description="relevant | latest | hot"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=20),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    import asyncio
    from app.core.redis import get_redis

    svc = CommunityService(db)
    result = await svc.search(
        query=q,
        search_type=type,
        channel=channel,
        sort=sort,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )
    await db.commit()

    # 异步记录搜索历史（独立 session，不阻塞响应）
    try:
        from app.core.database import async_session_maker
        _query = q
        _result_count = result.total_dreams + result.total_users
        _user_id = current_user.id if current_user else None

        async def _record():
            try:
                async with async_session_maker() as _db:
                    svc2 = TrendingService(_db)
                    await svc2.record_search(_query, _result_count, _user_id)
                    await _db.commit()
            except Exception as _e:
                logger.debug("搜索历史写入失败（后台）: %s", _e)

        asyncio.create_task(_record())
    except Exception:
        pass

    return result


@router.get("/search/suggestions", response_model=list[str], summary="搜索建议（含热门词）")
async def search_suggestions(
    q: str = Query("", max_length=50, description="搜索关键词（空时返回热门词）"),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = TrendingService(db)
        return await svc.get_search_suggestions(q, limit=6)
    except Exception:
        svc = CommunityService(db)
        if q.strip():
            return await svc.get_search_suggestions(q, limit=6)
        return []


# ── 热门推荐 ──────────────────────────────────────────────────────────────────

@router.get("/trending", response_model=TrendingResponse, summary="热门推荐（搜索词/梦境/标签/用户）")
async def get_trending(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = TrendingService(db)
        return await svc.get_trending(
            current_user_id=current_user.id if current_user else None
        )
    except Exception as e:
        logger.warning("get_trending 失败，返回空结果: %s", e)
        return TrendingResponse()

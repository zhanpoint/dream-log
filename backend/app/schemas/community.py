"""
社区模块 Pydantic Schemas
"""

from datetime import datetime
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────── 用户公开信息 ────────────────────────────

class UserPublicBrief(BaseModel):
    """用户简要公开信息（嵌入到 Feed 卡片）"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    dreamer_title: str = "做梦者"
    dreamer_level: int = 1


class UserPublicProfile(BaseModel):
    """用户完整公开主页"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    bio: str | None
    dreamer_title: str = "做梦者"
    dreamer_level: int = 1
    inspiration_points: int = 0
    public_dream_count: int = 0
    interpretation_count: int = 0
    follower_count: int = 0
    following_count: int = 0
    is_following: bool = False  # 当前用户是否已关注


# ──────────────────────────── Feed 梦境卡片 ────────────────────────────

class DreamCardSocial(BaseModel):
    """社区 Feed 梦境卡片（包含社交元数据，不含情绪字段）"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str | None
    content_preview: str
    dream_date: str
    dream_types: list[str] = []
    is_seeking_interpretation: bool = False
    is_anonymous: bool = False
    resonance_count: int = 0
    comment_count: int = 0
    interpretation_count: int = 0
    view_count: int = 0
    bookmark_count: int = 0
    share_count: int = 0
    has_resonated: bool = False
    has_bookmarked: bool = False
    author: UserPublicBrief | None = None
    created_at: datetime
    is_featured: bool = False
    inspiration_score: float | None = None


class FeedResponse(BaseModel):
    """Feed 分页响应"""
    total: int
    page: int
    page_size: int
    items: list[DreamCardSocial]


class FeatureDreamRequest(BaseModel):
    """管理员设置精选模式"""
    feature_mode: Literal["AUTO", "FORCE_ON", "FORCE_OFF"] = "AUTO"
    featured_reason: str | None = Field(default=None, max_length=500)


# ──────────────────────────── 评论 ────────────────────────────

class CommentAuthor(BaseModel):
    """评论作者信息"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    dreamer_level: int = 1


class CommentCreate(BaseModel):
    """发表评论请求"""
    content: str = Field(..., min_length=1, max_length=2000)
    is_interpretation: bool = False
    parent_id: UUID | None = None


class CommentUpdate(BaseModel):
    """修改评论"""
    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    """评论响应（赞同/反对：like_count=赞同数，downvote_count=反对数）"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    dream_id: UUID
    content: str
    is_interpretation: bool
    is_adopted: bool
    like_count: int
    downvote_count: int = 0
    inspire_count: int
    is_anonymous: bool
    has_liked: bool = False
    has_downvoted: bool = False
    author: CommentAuthor | None = None
    parent_id: UUID | None = None
    reply_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None


class CommentListResponse(BaseModel):
    """评论列表响应"""
    total: int
    items: list[CommentResponse]


class CommentVoteRequest(BaseModel):
    """评论赞同/反对请求"""
    vote: str | None = None  # "up" | "down" | null 表示取消


class CommentVoteResponse(BaseModel):
    """评论赞同/反对响应"""
    vote: str | None  # 当前投票 "up"|"down"|null
    up_count: int
    down_count: int


# ──────────────────────────── 共鸣 ────────────────────────────

class ResonanceResponse(BaseModel):
    """共鸣操作响应"""
    dream_id: UUID
    resonated: bool
    resonance_count: int


# ──────────────────────────── 关注 ────────────────────────────

class FollowResponse(BaseModel):
    """关注操作响应"""
    user_id: UUID
    following: bool
    follower_count: int


# ──────────────────────────── 收藏 ────────────────────────────

class BookmarkResponse(BaseModel):
    """收藏操作响应"""
    dream_id: UUID
    bookmarked: bool


# ──────────────────────────── 举报 ────────────────────────────

class ReportCreate(BaseModel):
    """举报请求"""
    target_type: str = Field(..., pattern="^(dream|comment)$")
    target_id: UUID
    reason: str = Field(..., min_length=1, max_length=50)
    description: str | None = Field(None, max_length=500)


# ──────────────────────────── 发现 ────────────────────────────

class TrendingTag(BaseModel):
    """热门标签"""
    name: str
    count: int
    is_fallback: bool = False


class ActiveInterpreter(BaseModel):
    """活跃解读者"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    interpretation_count: int
    dreamer_level: int = 1


# ──────────────────────────── 梦境社群 ────────────────────────────

class CommunityCreate(BaseModel):
    """创建社群请求"""
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(None, max_length=500)
    icon: str | None = None
    cover_image: str | None = None


class CommunityResponse(BaseModel):
    """社群详情响应"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None
    icon: str | None
    cover_image: str | None
    member_count: int
    post_count: int
    is_official: bool
    sort_order: int
    created_at: datetime
    is_member: bool = False  # 当前用户是否已加入


class CommunityListResponse(BaseModel):
    """社群列表响应"""
    total: int
    items: list[CommunityResponse]


class CommunityJoinResponse(BaseModel):
    """加入/退出社群响应"""
    community_id: UUID
    joined: bool
    member_count: int


# ──────────────────────────── 相似做梦者 ────────────────────────────

class SimilarDreamer(BaseModel):
    """相似做梦者"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    dreamer_level: int = 1
    common_tags: list[str] = []


# ──────────────────────────── 探索页汇总 ────────────────────────────

class ExploreResponse(BaseModel):
    """发现/探索页汇总数据"""
    trending_tags: list[TrendingTag] = []
    active_interpreters: list[ActiveInterpreter] = []
    recommended_communities: list[CommunityResponse] = []
    similar_dreamers: list[SimilarDreamer] = []


# ──────────────────────────── 搜索 ────────────────────────────

class UserSearchResult(BaseModel):
    """用户搜索结果项"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    bio: str | None = None
    dreamer_title: str = "做梦者"
    dreamer_level: int = 1
    inspiration_points: int = 0
    follower_count: int = 0
    is_following: bool = False


class SearchResponse(BaseModel):
    """搜索结果响应"""
    query: str
    total_dreams: int
    total_users: int
    dreams: list[DreamCardSocial] = []
    users: list[UserSearchResult] = []   # type=all 时返回前 3 个
    tags: list[str] = []                 # 匹配的情绪标签
    page: int
    page_size: int


# ──────────────────────────── 热门推荐 ────────────────────────────

class TrendingKeyword(BaseModel):
    """热门搜索词"""
    keyword: str
    score: float  # 热度分（前端可用于排序或展示热度条）


class RecommendedUser(BaseModel):
    """推荐用户"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    dreamer_title: str = "做梦者"
    dreamer_level: int = 1
    interpretation_count: int = 0
    follower_count: int = 0
    is_fallback: bool = False


class RisingInterpreter(BaseModel):
    """本周新星解梦者"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    avatar: str | None
    dreamer_level: int = 1
    interpretation_count: int = 0
    weekly_growth: int = 0


class CommunityMetrics(BaseModel):
    """社区实时业务指标（用于侧边栏社区动态）"""
    today_new_dreams: int = 0
    today_interpretation_replies: int = 0
    active_users_24h: int = 0


class TrendingResponse(BaseModel):
    """热门推荐汇总响应"""
    keywords: list[TrendingKeyword] = []    # 热门搜索词（前10）
    dreams: list[DreamCardSocial] = []      # 热门梦境（前6）
    tags: list[TrendingTag] = []            # 热门标签（前8）
    users: list[RecommendedUser] = []       # 推荐用户（前5）
    rising_users: list[RisingInterpreter] = []  # 本周新星解梦者
    metrics: CommunityMetrics = CommunityMetrics()
    updated_at: datetime = Field(default_factory=datetime.utcnow)

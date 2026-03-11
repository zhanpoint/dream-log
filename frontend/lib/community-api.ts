import { api } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserPublicBrief {
  id: string;
  username: string | null;
  avatar: string | null;
  dreamer_title: string;
  dreamer_level: number;
}

export interface UserPublicProfile extends UserPublicBrief {
  bio: string | null;
  inspiration_points: number;
  public_dream_count: number;
  interpretation_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  bookmarks_visibility: "private" | "friends" | "public";
  created_communities_visibility: "private" | "friends" | "public";
  joined_communities_visibility: "private" | "friends" | "public";
}

export interface DreamCardSocial {
  id: string;
  title: string | null;
  content_preview: string;
  dream_date: string;
  dream_types: string[];
  is_seeking_interpretation: boolean;
  is_anonymous: boolean;
  resonance_count: number;
  comment_count: number;
  interpretation_count: number;
  view_count: number;
  bookmark_count: number;
  share_count: number;
  has_resonated: boolean;
  has_bookmarked: boolean;
  author: UserPublicBrief | null;
  created_at: string;
  is_featured?: boolean;
  inspiration_score?: number;
}

export interface FeedResponse {
  total: number;
  page: number;
  page_size: number;
  items: DreamCardSocial[];
}

export interface CommentAuthor {
  id: string;
  username: string | null;
  avatar: string | null;
  dreamer_level: number;
}

export interface CommentResponse {
  id: string;
  dream_id: string;
  content: string;
  is_interpretation: boolean;
  is_adopted: boolean;
  like_count: number;
  downvote_count: number;
  inspire_count: number;
  is_anonymous: boolean;
  has_liked: boolean;
  has_downvoted: boolean;
  author: CommentAuthor | null;
  parent_id: string | null;
  reply_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface CommentListResponse {
  total: number;
  items: CommentResponse[];
}

export interface TrendingTag {
  name: string;
  count: number;
  is_fallback?: boolean;
}

export interface ActiveInterpreter {
  id: string;
  username: string | null;
  avatar: string | null;
  interpretation_count: number;
  dreamer_level: number;
}

// ── Phase 2 Types ──────────────────────────────────────────────────────────────

export interface CommunityResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  cover_image: string | null;
  member_count: number;
  post_count: number;
  is_official: boolean;
  sort_order: number;
  created_at: string;
  is_member: boolean;
  is_public: boolean;
}

export interface CommunityListResponse {
  total: number;
  items: CommunityResponse[];
}

export interface CommunityJoinResponse {
  community_id: string;
  joined: boolean;
  member_count: number;
}

export interface CommunitySidebarResponse {
  joined: CommunityResponse[];
  recent: CommunityResponse[];
}

export interface CommunityWeeklyMetrics {
  weekly_new_dreams: number;
  weekly_active_users: number;
  weekly_resonances: number;
  weekly_interpretations: number;
}

export interface CommunityOverviewResponse {
  community: CommunityResponse;
  metrics: CommunityWeeklyMetrics;
  rules: string[];
  value_points: string[];
}

export interface SimilarDreamer {
  id: string;
  username: string | null;
  avatar: string | null;
  dreamer_level: number;
  common_tags: string[];
}

export interface ExploreResponse {
  trending_tags: TrendingTag[];
  active_interpreters: ActiveInterpreter[];
  recommended_communities: CommunityResponse[];
  similar_dreamers: SimilarDreamer[];
}

export interface CommunityCreationApplicationCreate {
  name: string;
  description: string;
  motivation: string;
}

export interface CommunityCreationApplicationResponse {
  id: string;
  applicant_id: string;
  name: string;
  slug: string;
  description: string | null;
  motivation: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  created_community_id: string | null;
  created_at: string;
}

export interface UserAssetsMetaResponse {
  can_view_bookmarks: boolean;
  can_view_created_communities: boolean;
  can_view_joined_communities: boolean;
  public_dream_count: number;
  bookmarked_dream_count: number;
  created_community_count: number;
  joined_community_count: number;
}

export interface UserAssetsResponse {
  created_communities: CommunityResponse[];
  joined_communities: CommunityResponse[];
  bookmarked_dreams: FeedResponse;
  public_dreams: FeedResponse;
  can_view_bookmarks: boolean;
  can_view_created_communities: boolean;
  can_view_joined_communities: boolean;
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export type FeedChannel = "plaza" | "roundtable" | "greenhouse" | "museum";
export type FeedSort = "latest" | "resonating" | "following" | "foryou";

export const communityAPI = {
  getFeed: async (params: {
    channel?: FeedChannel;
    sort?: FeedSort;
    page?: number;
    page_size?: number;
  }): Promise<FeedResponse> => {
    const res = await api.get<FeedResponse>("/community/feed", { params });
    return res.data;
  },

  getDream: async (dreamId: string): Promise<DreamCardSocial> => {
    const res = await api.get<DreamCardSocial>(`/community/dreams/${dreamId}`);
    return res.data;
  },

  /** 记录社区梦境详情被浏览一次（同一会话内由调用方用 sessionStorage 控制只请求一次） */
  incrementDreamView: async (dreamId: string): Promise<{ view_count: number }> => {
    const res = await api.post<{ view_count: number }>(`/community/dreams/${dreamId}/view`);
    return res.data;
  },

  /** 记录社区梦境被分享一次（点击分享时调用） */
  incrementDreamShare: async (dreamId: string): Promise<{ share_count: number }> => {
    const res = await api.post<{ share_count: number }>(`/community/dreams/${dreamId}/share`);
    return res.data;
  },

  // ── 共鸣 ────────────────────────────────────────────────────────────────

  toggleResonate: async (dreamId: string): Promise<{ resonated: boolean; resonance_count: number }> => {
    const res = await api.post(`/community/dreams/${dreamId}/resonate`);
    return res.data;
  },

  // ── 评论 ────────────────────────────────────────────────────────────────

  getComments: async (
    dreamId: string,
    params?: { is_interpretation?: boolean; parent_id?: string; limit?: number; offset?: number }
  ): Promise<CommentListResponse> => {
    const res = await api.get<CommentListResponse>(`/community/dreams/${dreamId}/comments`, { params });
    return res.data;
  },

  createComment: async (
    dreamId: string,
    data: { content: string; is_interpretation: boolean; parent_id?: string }
  ): Promise<CommentResponse> => {
    const res = await api.post<CommentResponse>(`/community/dreams/${dreamId}/comments`, data);
    return res.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/community/comments/${commentId}`);
  },

  /** 评论赞同/反对（与梦境共鸣无关）。vote: 'up'|'down'|null 表示取消 */
  voteComment: async (
    commentId: string,
    vote: "up" | "down" | null
  ): Promise<{ vote: "up" | "down" | null; up_count: number; down_count: number }> => {
    const res = await api.post(`/community/comments/${commentId}/vote`, { vote });
    return res.data;
  },

  adoptInterpretation: async (commentId: string): Promise<void> => {
    await api.post(`/community/comments/${commentId}/adopt`);
  },

  // ── 关注 ────────────────────────────────────────────────────────────────

  toggleFollow: async (userId: string): Promise<{ following: boolean; follower_count: number }> => {
    const res = await api.post(`/community/users/${userId}/follow`);
    return res.data;
  },

  // ── 用户主页 ─────────────────────────────────────────────────────────────

  getUserProfile: async (userId: string): Promise<UserPublicProfile> => {
    const res = await api.get<UserPublicProfile>(`/community/users/${userId}/profile`);
    return res.data;
  },

  getUserDreams: async (userId: string, page = 1, pageSize = 12): Promise<FeedResponse> => {
    const res = await api.get<FeedResponse>(`/community/users/${userId}/dreams`, {
      params: { page, page_size: pageSize },
    });
    return res.data;
  },

  // ── 收藏 ────────────────────────────────────────────────────────────────

  toggleBookmark: async (dreamId: string): Promise<{ bookmarked: boolean }> => {
    const res = await api.post(`/community/dreams/${dreamId}/bookmark`);
    return res.data;
  },

  getBookmarks: async (page = 1, pageSize = 20): Promise<FeedResponse> => {
    const res = await api.get<FeedResponse>("/community/bookmarks", { params: { page, page_size: pageSize } });
    return res.data;
  },

  // ── 举报 ────────────────────────────────────────────────────────────────

  createReport: async (data: {
    target_type: "dream" | "comment";
    target_id: string;
    reason: string;
    description?: string;
  }): Promise<void> => {
    await api.post("/community/report", data);
  },

  // ── 发现 ────────────────────────────────────────────────────────────────

  getTrendingTags: async (limit = 10): Promise<TrendingTag[]> => {
    const res = await api.get<TrendingTag[]>("/community/explore/trending-tags", { params: { limit } });
    return res.data;
  },

  getActiveInterpreters: async (limit = 5): Promise<ActiveInterpreter[]> => {
    const res = await api.get<ActiveInterpreter[]>("/community/explore/active-interpreters", { params: { limit } });
    return res.data;
  },

  // ── 发现页汇总 ────────────────────────────────────────────────────────────

  getExplore: async (): Promise<ExploreResponse> => {
    const res = await api.get<ExploreResponse>("/community/explore");
    return res.data;
  },

  // ── 梦境社群 ─────────────────────────────────────────────────────────────

  getCommunities: async (): Promise<CommunityListResponse> => {
    const res = await api.get<CommunityListResponse>("/community/communities");
    return res.data;
  },

  getCommunity: async (slug: string): Promise<CommunityResponse> => {
    const res = await api.get<CommunityResponse>(`/community/communities/${slug}`);
    return res.data;
  },

  getCommunityFeed: async (
    slug: string,
    params?: { sort?: FeedSort; page?: number; page_size?: number }
  ): Promise<FeedResponse> => {
    const res = await api.get<FeedResponse>(`/community/communities/${slug}/feed`, { params });
    return res.data;
  },

  joinCommunity: async (slug: string): Promise<CommunityJoinResponse> => {
    const res = await api.post<CommunityJoinResponse>(`/community/communities/${slug}/join`);
    return res.data;
  },

  createCommunityApplication: async (
    data: CommunityCreationApplicationCreate
  ): Promise<CommunityCreationApplicationResponse> => {
    const res = await api.post<CommunityCreationApplicationResponse>("/community/communities/applications", data);
    return res.data;
  },

  getGreenhouseSidebar: async (): Promise<CommunitySidebarResponse> => {
    const res = await api.get<CommunitySidebarResponse>("/community/greenhouse/sidebar");
    return res.data;
  },

  getGreenhouseOverview: async (slug: string): Promise<CommunityOverviewResponse> => {
    const res = await api.get<CommunityOverviewResponse>(`/community/greenhouse/${slug}/overview`);
    return res.data;
  },

  getUserAssetsMeta: async (userId: string): Promise<UserAssetsMetaResponse> => {
    const res = await api.get<UserAssetsMetaResponse>(`/community/users/${userId}/assets/meta`);
    return res.data;
  },

  getUserAssets: async (
    userId: string,
    kind: "all" | "public" | "bookmarks" | "created" | "joined" = "all"
  ): Promise<UserAssetsResponse> => {
    const res = await api.get<UserAssetsResponse>(`/community/users/${userId}/assets`, { params: { kind } });
    return res.data;
  },

  // ── 精选 (Admin) ──────────────────────────────────────────────────────────

  featureDream: async (
    dreamId: string,
    data: { feature_mode: "AUTO" | "FORCE_ON" | "FORCE_OFF"; featured_reason?: string }
  ): Promise<{ dream_id: string; feature_mode: "AUTO" | "FORCE_ON" | "FORCE_OFF"; is_featured: boolean; featured_score_snapshot: number | null }> => {
    const res = await api.post(`/community/dreams/${dreamId}/feature`, data);
    return res.data;
  },

  // ── 搜索 ──────────────────────────────────────────────────────────────────

  search: async (params: {
    q: string;
    type?: "all" | "dreams" | "users" | "tags";
    channel?: FeedChannel;
    sort?: "relevant" | "latest" | "hot";
    page?: number;
    page_size?: number;
  }): Promise<SearchResponse> => {
    const res = await api.get<SearchResponse>("/community/search", { params });
    return res.data;
  },

  searchSuggestions: async (q: string): Promise<string[]> => {
    const res = await api.get<string[]>("/community/search/suggestions", { params: { q } });
    return res.data;
  },

  // ── 热门推荐 ─────────────────────────────────────────────────────────────

  getTrending: async (): Promise<TrendingResponse> => {
    const res = await api.get<TrendingResponse>("/community/trending");
    return res.data;
  },
};

// ── Search Types ───────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  dreamer_title: string;
  dreamer_level: number;
  inspiration_points: number;
  follower_count: number;
  is_following: boolean;
}

export interface SearchResponse {
  query: string;
  total_dreams: number;
  total_users: number;
  dreams: DreamCardSocial[];
  users: UserSearchResult[];
  tags: string[];
  page: number;
  page_size: number;
}

// ── Trending Types ─────────────────────────────────────────────────────────────

export interface TrendingKeyword {
  keyword: string;
  score: number;
}

export interface RecommendedUser {
  id: string;
  username: string | null;
  avatar: string | null;
  dreamer_title: string;
  dreamer_level: number;
  interpretation_count: number;
  follower_count: number;
  is_fallback?: boolean;
}

export interface RisingInterpreter {
  id: string;
  username: string | null;
  avatar: string | null;
  dreamer_level: number;
  interpretation_count: number;
  weekly_growth: number;
}

export interface CommunityMetrics {
  today_new_dreams: number;
  today_interpretation_replies: number;
  active_users_24h: number;
}

export interface TrendingResponse {
  keywords: TrendingKeyword[];
  dreams: DreamCardSocial[];
  tags: TrendingTag[];
  users: RecommendedUser[];
  rising_users: RisingInterpreter[];
  metrics: CommunityMetrics;
  updated_at: string;
}

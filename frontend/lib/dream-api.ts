/**
 * 梦境 API 服务
 */

import { API_ORIGIN, TOKEN_KEYS, api, getCached, setCache, invalidateCache, dedupeGet } from "./api";

// ============= 类型定义 =============

export interface TagItem {
  id: string;
  name: string;
}

export type Tag = TagItem;

export interface DreamAttachmentItem {
  id: string;
  attachment_type: string;
  file_url: string;
  thumbnail_url?: string | null;
  mime_type?: string | null;
  duration?: number | null;
}

export interface DreamListItem {
  id: string;
  user_id: string;
  title: string | null;
  title_generated_by_ai: boolean;
  dream_date: string;
  dream_time: string | null;
  content_preview: string;
  primary_emotion: string | null;
  emotion_intensity: number | null;
  lucidity_level: number | null;
  vividness_level: number | null;
  ai_processed: boolean;
  ai_processing_status: string;
  is_favorite: boolean;
  is_draft: boolean;
  created_at: string;
  /** 隐私等级：PRIVATE | FRIENDS | PUBLIC */
  privacy_level?: string;
  /** 浏览次数 */
  view_count?: number;
  dream_types: string[];
  tags: TagItem[];
  attachments_count: number;
}

export interface DreamDetail {
  id: string;
  user_id: string;
  title: string | null;
  title_generated_by_ai: boolean;
  is_draft: boolean;
  dream_date: string;
  dream_time: string | null;
  content: string;
  completeness_score: number | null;
  is_nap: boolean;
  // 睡眠
  sleep_start_time: string | null;
  awakening_time: string | null;
  sleep_duration_minutes: number | null;
  awakening_state: string | null;
  sleep_quality: number | null;
  sleep_fragmented: boolean | null;
  sleep_depth: number | null;
  // 情绪
  primary_emotion: string | null;
  emotion_intensity: number | null;
  emotion_residual: boolean | null;
  triggers: { name: string; confidence?: number; reasoning?: string | null }[];
  // 特征
  lucidity_level: number | null;
  vividness_level: number | null;
  // 感官
  sensory_visual: number | null;
  sensory_auditory: number | null;
  sensory_tactile: number | null;
  sensory_olfactory: number | null;
  sensory_gustatory: number | null;
  sensory_spatial: number | null;
  // 现实关联
  reality_correlation: number | null;
  // AI
  ai_processed: boolean;
  ai_processing_status: string;
  ai_processed_at: string | null;
  ai_image_url: string | null;
  // 洞察
  life_context: string | null;
  user_interpretation: string | null;
  content_structured: Record<string, unknown> | null;
  ai_analysis: Record<string, unknown> | null;
  reflection_answers?: { question: string; answer: string }[] | null;
  // 元数据
  privacy_level: string;
  is_favorite: boolean;
  view_count: number;
  parent_dream_id: string | null;
  // 关联
  dream_types: string[];
  tags: TagItem[];
  attachments_count: number;
  attachments: DreamAttachmentItem[];
  // 时间
  created_at: string;
  updated_at: string | null;
}

export interface DreamListResponse {
  total: number;
  page: number;
  page_size: number;
  items: DreamListItem[];
}

export interface DreamStats {
  total: number;
  consecutive_days: number;
  this_week_count: number;
  this_month_count: number;
}

export interface CreateDreamPayload {
  title?: string;
  dream_date: string;
  dream_time?: string;
  content: string;
  is_nap?: boolean;
  sleep_start_time?: string;
  awakening_time?: string;
  sleep_duration_minutes?: number;
  awakening_state?: string;
  sleep_quality?: number;
  sleep_fragmented?: boolean;
  sleep_depth?: number;
  primary_emotion?: string;
  emotion_intensity?: number;
  emotion_residual?: boolean;
  dream_types?: string[];
  lucidity_level?: number;
  vividness_level?: number;
  completeness_score?: number;
  life_context?: string;
  reality_correlation?: number;
  user_interpretation?: string;
  triggers?: string[];
  privacy_level?: string;
  title_generated_by_ai?: boolean;
  is_anonymous?: boolean;
  is_seeking_interpretation?: boolean;
  community_id?: string;
}

export interface DreamListParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  dream_type?: string;
  emotion?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  is_favorite?: boolean;
  privacy_level?: string;
}

// ============= API 调用 =============

export const DreamApi = {
  /** 创建梦境 */
  async create(data: CreateDreamPayload): Promise<DreamDetail> {
    const res = await api.post("/dreams", data);
    invalidateCache("/dreams");
    return res.data;
  },

  /** 获取梦境列表（带缓存去重，TTL 20s） */
  async list(params: DreamListParams = {}): Promise<DreamListResponse> {
    const key = `/dreams?${JSON.stringify(params)}`;
    const cached = getCached<DreamListResponse>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      const res = await api.get("/dreams", { params });
      setCache(key, res.data, 20_000);
      return res.data;
    });
  },

  /** 获取梦境统计（带缓存，TTL 60s） */
  async getStats(): Promise<DreamStats> {
    const key = "/dreams/stats";
    const cached = getCached<DreamStats>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      const res = await api.get("/dreams/stats");
      setCache(key, res.data, 60_000);
      return res.data;
    });
  },

  /** 获取梦境详情（带缓存，TTL 30s） */
  async get(id: string): Promise<DreamDetail> {
    const key = `/dreams/${id}`;
    const cached = getCached<DreamDetail>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      const res = await api.get(`/dreams/${id}`);
      setCache(key, res.data, 30_000);
      return res.data;
    });
  },

  /** 更新梦境 */
  async update(id: string, data: Partial<CreateDreamPayload>): Promise<DreamDetail> {
    const res = await api.patch(`/dreams/${id}`, data);
    // 更新后刷新缓存而不是删除，让下次访问立即显示最新数据
    setCache(`/dreams/${id}`, res.data, 30_000);
    invalidateCache("/dreams?");
    invalidateCache("/dreams/stats");
    return res.data;
  },

  /** 删除梦境 */
  async delete(id: string): Promise<void> {
    await api.delete(`/dreams/${id}`);
    invalidateCache(`/dreams/${id}`);
    invalidateCache("/dreams?");
    invalidateCache("/dreams/stats");
  },

  /** 一键删除当前用户所有梦境 */
  async deleteAll(): Promise<void> {
    await api.delete("/dreams");
    invalidateCache("/dreams?");
    invalidateCache("/dreams/stats");
  },

  /** 切换收藏 */
  async toggleFavorite(id: string): Promise<{ is_favorite: boolean }> {
    const res = await api.post(`/dreams/${id}/favorite`);
    invalidateCache(`/dreams/${id}`);
    invalidateCache("/dreams?");
    return res.data;
  },

  /** 记录浏览次数 */
  async incrementView(id: string): Promise<{ view_count: number }> {
    const res = await api.post(`/dreams/${id}/view`);
    return res.data;
  },

  /** 生成梦境标题（独立调用，不依赖梦境 ID） */
  async generateTitleStandalone(content: string): Promise<{ title: string }> {
    const res = await api.post("/dreams/generate-title", { content });
    return res.data;
  },

  /** 润色「补充说明」输入框内的短指令 */
  async optimizeInstruction(text: string): Promise<{ text: string }> {
    const res = await api.post("/dreams/optimize-instruction", { text }, { timeout: 60_000 });
    return res.data;
  },

  /** 梦境正文 AI：流式返回增量文本（SSE） */
  async assistContentStream(
    payload: {
      content: string;
      action?: "imagery_completion" | "literary_polish" | "smart_continue" | null;
      instruction: string;
    },
    options: {
      signal?: AbortSignal;
      onMeta?: (meta: { action: "imagery_completion" | "literary_polish" | "smart_continue" }) => void;
      onDelta?: (deltaText: string) => void;
      onDone?: (result: { text: string; action: "imagery_completion" | "literary_polish" | "smart_continue" }) => void;
    } = {}
  ): Promise<void> {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN) : null;
    const lang =
      typeof document !== "undefined"
        ? (document.documentElement.lang || navigator.language || "cn").replace(/^zh(-.*)?$/i, "cn")
        : "cn";
    const resp = await fetch(`${API_ORIGIN}/api/dreams/assist-content/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
    if (!resp.ok) {
      let detail = "生成失败，请稍后重试";
      try {
        const body = await resp.json();
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // ignore non-json error body
      }
      throw new Error(detail);
    }
    const reader = resp.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    const handleEvent = (raw: string) => {
      const lines = raw.split("\n");
      const eventType = lines.find((l) => l.startsWith("event:"))?.slice(6).trim() || "message";
      const dataText = lines
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!dataText) return;
      const data = JSON.parse(dataText) as Record<string, unknown>;
      if (eventType === "meta" && data.action) {
        options.onMeta?.({ action: data.action as "imagery_completion" | "literary_polish" | "smart_continue" });
      } else if (eventType === "delta" && typeof data.text === "string") {
        options.onDelta?.(data.text);
      } else if (eventType === "done" && typeof data.text === "string" && data.action) {
        options.onDone?.({
          text: data.text,
          action: data.action as "imagery_completion" | "literary_polish" | "smart_continue",
        });
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const p of parts) handleEvent(p);
    }
    if (buffer.trim()) handleEvent(buffer);
  },

  /** 触发 AI 分析 */
  async triggerAnalysis(id: string): Promise<{ message: string; status: string }> {
    const res = await api.post(`/dreams/${id}/analyze`);
    invalidateCache(`/dreams/${id}`);
    return res.data;
  },

  /** 取消 AI 分析 */
  async cancelAnalysis(id: string): Promise<{ status: string }> {
    const res = await api.post(`/dreams/${id}/analysis-cancel`);
    return res.data;
  },

  /** 查询分析状态 */
  async getAnalysisStatus(id: string) {
    const res = await api.get(`/dreams/${id}/analysis-status`);
    return res.data;
  },

  /** 添加反思回答 */
  async addReflectionAnswer(
    id: string,
    data: { question: string; answer: string }
  ): Promise<DreamDetail> {
    const res = await api.post(`/dreams/${id}/reflection-answers`, data);
    return res.data;
  },

  /** 添加标签到梦境 */
  async addTag(dreamId: string, tagId: string): Promise<void> {
    await api.post(`/dreams/${dreamId}/tags/${tagId}`);
  },

  /** 移除梦境标签 */
  async removeTag(dreamId: string, tagId: string): Promise<void> {
    await api.delete(`/dreams/${dreamId}/tags/${tagId}`);
  },

  /** 获取附件预签名上传 URL */
  async getAttachmentUploadUrl(
    dreamId: string,
    filename: string,
    contentType: string
  ): Promise<{ upload_url: string; access_url: string; file_key: string }> {
    const res = await api.post(`/dreams/${dreamId}/attachments/presign`, null, {
      params: { filename, content_type: contentType },
    });
    return res.data;
  },

  /** 上传文件到 OSS (PUT) */
  async uploadToOSS(uploadUrl: string, file: Blob, contentType: string): Promise<void> {
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });
  },

  /** 创建附件记录 */
  async createAttachment(
    dreamId: string,
    data: { file_url: string; attachment_type: string; file_size?: number; mime_type?: string; duration?: number }
  ): Promise<{ id: string; file_url: string; attachment_type: string }> {
    const res = await api.post(`/dreams/${dreamId}/attachments`, null, {
      params: data,
    });
    return res.data;
  },

  /** 删除附件 */
  async deleteAttachment(dreamId: string, attachmentId: string): Promise<void> {
    await api.delete(`/dreams/${dreamId}/attachments/${attachmentId}`);
  },

  /** 使用 AI 生成梦境图像，上传至 OSS，返回访问 URL */
  async generateImage(id: string, opts?: { signal?: AbortSignal }): Promise<{ image_url: string }> {
    // 该接口包含模型推理 + OSS 上传，耗时显著高于普通 CRUD
    const res = await api.post(`/dreams/${id}/generate-image`, null, {
      timeout: 180_000,
      signal: opts?.signal,
    });
    // 生成后立即刷新详情缓存，避免 UI 显示旧数据
    invalidateCache(`/dreams/${id}`);
    return res.data;
  },

  /** 取消 AI 图像生成 */
  async cancelGenerateImage(id: string): Promise<{ status: string }> {
    const res = await api.post(`/dreams/${id}/generate-image-cancel`);
    return res.data;
  },

  /** 获取相似梦境列表（带缓存，TTL 5min，变化很少） */
  async getSimilarDreams(id: string): Promise<DreamListItem[]> {
    const key = `/dreams/${id}/similar`;
    const cached = getCached<DreamListItem[]>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      const res = await api.get(`/dreams/${id}/similar`);
      setCache(key, res.data, 300_000);
      return res.data;
    });
  },
};

// ============= 标签 API =============

export const TagApi = {
  /** 获取标签列表 */
  async list(): Promise<TagItem[]> {
    const res = await api.get("/tags");
    return res.data;
  },

  /** 创建标签 */
  async create(data: { name: string }): Promise<TagItem> {
    const res = await api.post("/tags", data);
    return res.data;
  },

  /** 删除标签 */
  async delete(id: string): Promise<void> {
    await api.delete(`/tags/${id}`);
  },
};

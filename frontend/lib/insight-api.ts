import { api, getCached, setCache, dedupeGet, invalidateCache } from "./api";
import { handleAuthError } from "./auth-error-handler";

export type InsightType =
  | "MONTHLY"
  | "WEEKLY"
  | "ANNUAL"
  | "EMOTION_HEALTH"
  | "SLEEP_QUALITY"
  | "THEME_PATTERN";

export interface Insight {
  id: string;
  insight_type: InsightType;
  title: string;
  time_period_start: string | null;
  time_period_end: string | null;
  data: Record<string, unknown>;
  narrative: string | null;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface InsightListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Insight[];
}

export interface InsightSettings {
  monthly_report_enabled: boolean;
  weekly_report_enabled: boolean;
  annual_report_enabled: boolean;
  show_comparison: boolean;
  notify_on_reports: boolean;
}

export interface InsightUnreadSummary {
  weekly: boolean;
  monthly: boolean;
  annual: boolean;
  emotion_health: boolean;
  sleep_quality: boolean;
  theme_pattern: boolean;
}

class InsightAPIService {
  async list(params?: {
    insight_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<InsightListResponse> {
    const key = `/insights?${JSON.stringify(params ?? {})}`;
    const cached = getCached<InsightListResponse>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      try {
        const res = await api.get<InsightListResponse>("/insights", { params });
        setCache(key, res.data, 60_000); // 洞察列表缓存 1 分钟
        return res.data;
      } catch (error) {
        throw handleAuthError(error);
      }
    });
  }

  async getById(id: string): Promise<Insight> {
    const key = `/insights/${id}`;
    const cached = getCached<Insight>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      try {
        const res = await api.get<Insight>(`/insights/${id}`);
        setCache(key, res.data, 120_000); // 洞察详情缓存 2 分钟
        return res.data;
      } catch (error) {
        throw handleAuthError(error);
      }
    });
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await api.post(`/insights/${id}/read`);
      invalidateCache("/insights?");
      invalidateCache("/insights/unread");
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/insights/${id}`);
      invalidateCache(`/insights/${id}`);
      invalidateCache("/insights?");
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async generateMonthly(year: number, month: number): Promise<Insight> {
    try {
      const res = await api.post<Insight>("/insights/monthly/generate", { year, month });
      invalidateCache("/insights?");
      invalidateCache("/insights/unread-summary");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async generateWeekly(weekStart: string): Promise<Insight> {
    try {
      const res = await api.post<Insight>("/insights/weekly/generate", { week_start: weekStart });
      invalidateCache("/insights?");
      invalidateCache("/insights/unread-summary");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async generateAnnual(year: number): Promise<Insight> {
    try {
      const res = await api.post<Insight>("/insights/annual/generate", { year });
      invalidateCache("/insights?");
      invalidateCache("/insights/unread-summary");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async generateTheme(params: {
    report_type: "EMOTION_HEALTH" | "SLEEP_QUALITY" | "THEME_PATTERN";
    start_date: string;
    end_date: string;
    with_comparison?: boolean;
  }): Promise<Insight> {
    try {
      const res = await api.post<Insight>("/insights/theme/generate", params);
      invalidateCache("/insights?");
      invalidateCache("/insights/unread-summary");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async getSettings(): Promise<InsightSettings> {
    try {
      const res = await api.get<InsightSettings>("/insights/settings");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async updateSettings(data: Partial<InsightSettings>): Promise<InsightSettings> {
    try {
      const res = await api.put<InsightSettings>("/insights/settings", data);
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async cleanup(): Promise<number> {
    try {
      const res = await api.post<{ count: number }>("/insights/cleanup");
      return res.data?.count ?? 0;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async cleanupAll(): Promise<void> {
    try {
      await api.post("/insights/cleanup/all");
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async getUnreadSummary(): Promise<InsightUnreadSummary> {
    const key = "/insights/unread-summary";
    const cached = getCached<InsightUnreadSummary>(key);
    if (cached) return cached;
    return dedupeGet(key, async () => {
      try {
        const res = await api.get<InsightUnreadSummary>("/insights/unread-summary");
        setCache(key, res.data, 30_000);
        return res.data;
      } catch (error) {
        throw handleAuthError(error);
      }
    });
  }
}

export const insightAPI = new InsightAPIService();

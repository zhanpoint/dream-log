import { api } from "./api";
import { handleAuthError } from "./auth-error-handler";

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  metadata_: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  total: number;
  items: Notification[];
}

class NotificationAPIService {
  async list(params?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> {
    try {
      const res = await api.get<NotificationListResponse>("/notifications", {
        params,
      });
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get<{ count: number }>("/notifications/unread-count");
      return res.data.count;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await api.post(`/notifications/${id}/read`);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async markAllAsRead(): Promise<number> {
    try {
      const res = await api.post<{ marked: number }>("/notifications/read-all");
      return res.data.marked;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      throw handleAuthError(error);
    }
  }
}

export const notificationAPI = new NotificationAPIService();

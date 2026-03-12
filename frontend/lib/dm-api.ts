import { API_ORIGIN, api, TOKEN_KEYS } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DmMessageOut {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: "text" | "image" | "audio" | "dream_ref";
  media_url?: string | null;
  created_at: string;
}

export interface DmConversationOut {
  id: string;
  initiator_id: string;
  recipient_id: string;
  status: "pending" | "active" | "blocked";
  source_dream_id: string | null;
  last_message_at: string | null;
  created_at: string;
  /** Backend may return flattened other user fields */
  other_user_id?: string;
  other_username?: string | null;
  other_avatar?: string | null;
  /** Optional nested shape used by some endpoints */
  other_user?: {
    id: string;
    username: string | null;
    avatar: string | null;
    dreamer_level?: number;
    dreamer_title?: string;
  };
  last_message?: DmMessageOut;
  last_message_preview?: string | null;
  /** Source dream card snippet */
  source_dream?: {
    id: string;
    title: string | null;
    content_preview: string;
  } | null;
}

export interface DmMessageListResponse {
  total: number;
  items: DmMessageOut[];
}

export interface SendKnockRequest {
  content: string;
  source_dream_id?: string;
}

export interface SendMessageRequest {
  content: string;
  content_type?: "text" | "image" | "audio";
  media_url?: string;
}

export interface UploadDmImageResponse {
  object_key: string;
  signed_url: string;
  content_type: string;
  size: number;
}

export interface RefreshDmImageUrlResponse {
  message_id: string;
  media_url: string;
}

export interface DmWsEventConnected {
  type: "connected";
  conversation_id: string;
}

export interface DmWsEventMessageNew {
  type: "message:new";
  conversation_id: string;
  message: DmMessageOut;
}

export type DmWsEvent = DmWsEventConnected | DmWsEventMessageNew;

// ── API ───────────────────────────────────────────────────────────────────────

const getDmWsUrl = (conversationId: string): string | null => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  if (!token) return null;

  const apiBase = API_ORIGIN.replace(/\/$/, "");
  const wsBase = apiBase.startsWith("https://")
    ? apiBase.replace("https://", "wss://")
    : apiBase.replace("http://", "ws://");

  return `${wsBase}/api/dm/conversations/${conversationId}/ws?token=${encodeURIComponent(token)}`;
};

export const dmAPI = {
  getConversations: async (): Promise<DmConversationOut[]> => {
    const res = await api.get<DmConversationOut[]>("/dm/conversations");
    return res.data;
  },

  sendKnock: async (recipientId: string, data: SendKnockRequest): Promise<DmConversationOut> => {
    const res = await api.post<DmConversationOut>(`/dm/conversations/knock/${recipientId}`, data);
    return res.data;
  },

  getMessages: async (
    conversationId: string,
    params?: { limit?: number; before?: string }
  ): Promise<DmMessageListResponse> => {
    const res = await api.get<DmMessageListResponse>(`/dm/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  uploadImage: async (conversationId: string, file: File): Promise<UploadDmImageResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<UploadDmImageResponse>(`/dm/conversations/${conversationId}/images`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  sendMessage: async (conversationId: string, data: SendMessageRequest): Promise<DmMessageOut> => {
    const res = await api.post<DmMessageOut>(`/dm/conversations/${conversationId}/messages`, data);
    return res.data;
  },

  refreshImageUrl: async (conversationId: string, messageId: string): Promise<RefreshDmImageUrlResponse> => {
    const res = await api.post<RefreshDmImageUrlResponse>(
      `/dm/conversations/${conversationId}/messages/${messageId}/refresh-media-url`
    );
    return res.data;
  },

  blockConversation: async (conversationId: string): Promise<void> => {
    await api.post(`/dm/conversations/${conversationId}/block`);
  },

  connectConversationWs: (
    conversationId: string,
    handlers: {
      onOpen?: () => void;
      onClose?: () => void;
      onError?: () => void;
      onEvent?: (event: DmWsEvent) => void;
    }
  ): WebSocket | null => {
    const wsUrl = getDmWsUrl(conversationId);
    if (!wsUrl) return null;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      handlers.onOpen?.();
    };

    ws.onclose = () => {
      handlers.onClose?.();
    };

    ws.onerror = () => {
      handlers.onError?.();
    };

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as DmWsEvent;
        handlers.onEvent?.(parsed);
      } catch {
        // ignore invalid ws payload
      }
    };

    return ws;
  },
};

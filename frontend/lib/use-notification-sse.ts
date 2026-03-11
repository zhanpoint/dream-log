import { useEffect, useRef, useState, useCallback } from "react";
import { Notification } from "./notification-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type SSEConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface UseNotificationSSEOptions {
  onNotification?: (notification: Notification) => void;
  onUnreadCountChange?: (count: number) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface UseNotificationSSEReturn {
  status: SSEConnectionStatus;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * SSE 通知推送 Hook
 * 
 * 自动建立和管理 SSE 连接，接收实时通知推送
 * 使用 fetch API + ReadableStream 实现，支持自定义 Authorization header
 * 
 * @example
 * ```tsx
 * const { status } = useNotificationSSE({
 *   onNotification: (notification) => {
 *     console.log('收到新通知:', notification);
 *     toast.success(notification.title);
 *   },
 *   onUnreadCountChange: (count) => {
 *     setUnreadCount(count);
 *   }
 * });
 * ```
 */
export function useNotificationSSE(
  options: UseNotificationSSEOptions = {}
): UseNotificationSSEReturn {
  const {
    onNotification,
    onUnreadCountChange,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const unreadCountRef = useRef(0);
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearReconnectTimer();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus("disconnected");
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    // 防止重复连接
    if (abortControllerRef.current) {
      return;
    }

    shouldConnectRef.current = true;
    setStatus("connecting");
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    (async () => {
      try {
        // 从 localStorage 获取 token
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("未登录，无法建立 SSE 连接");
        }

        // 使用 fetch API 建立 SSE 连接
        const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "text/event-stream",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE 连接失败: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("响应体为空");
        }

        console.log("[SSE] 开始读取流...");

        // 读取流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (shouldConnectRef.current) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("[SSE] 流结束");
            abortControllerRef.current = null;
            setStatus("disconnected");
            if (autoReconnect && shouldConnectRef.current) {
              reconnectTimerRef.current = setTimeout(() => {
                connect();
              }, reconnectInterval);
            }
            break;
          }

          // 解码数据
          buffer += decoder.decode(value, { stream: true });

          // 按行分割
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 保留不完整的行

          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6).trim();
            } else if (line === "") {
              // 空行表示一个完整的事件
              if (eventType && eventData) {
                handleSSEEvent(eventType, eventData);
              }
              eventType = "";
              eventData = "";
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[SSE] 连接被中止");
          return;
        }

        const error = err instanceof Error ? err : new Error("SSE 连接失败");
        console.error("[SSE] 连接错误:", error);
        setError(error);
        setStatus("error");

        // 自动重连
        if (autoReconnect && shouldConnectRef.current) {
          console.log(`[SSE] ${reconnectInterval}ms 后重新连接...`);
          reconnectTimerRef.current = setTimeout(() => {
            abortControllerRef.current = null;
            connect();
          }, reconnectInterval);
        }
      }
    })();

    function handleSSEEvent(event: string, data: string) {
      try {
        const parsedData = JSON.parse(data);

        switch (event) {
          case "connected":
            console.log("[SSE] 连接已建立");
            setStatus("connected");
            clearReconnectTimer();
            break;

          case "heartbeat":
            // console.log("[SSE] 心跳");
            break;

          case "notification":
            const notification: Notification = parsedData;
            console.log("[SSE] 收到新通知:", notification);

            // 更新未读数
            if (!notification.is_read) {
              unreadCountRef.current += 1;
              onUnreadCountChangeRef.current?.(unreadCountRef.current);
            }

            // 触发回调
            onNotificationRef.current?.(notification);
            break;

          case "unread_count":
            const { count } = parsedData;
            unreadCountRef.current = count;
            onUnreadCountChangeRef.current?.(count);
            break;

          default:
            console.log(`[SSE] 未知事件类型: ${event}`, parsedData);
        }
      } catch (err) {
        console.error(`[SSE] 解析事件数据失败 (${event}):`, err);
      }
    }
  }, [
    autoReconnect,
    reconnectInterval,
    clearReconnectTimer,
  ]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  // 组件挂载时自动连接
  useEffect(() => {
    connect();

    // 组件卸载时断开连接
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    error,
    reconnect,
    disconnect,
  };
}

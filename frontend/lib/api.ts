import axios from "axios";

/**
 * API 基础配置
 */
function getApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;

  // 服务器侧/构建期：避免把生产环境默认指到 localhost
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development" ? "http://localhost:8000" : "";
  }

  // 浏览器侧：避免生产站点误连到开发机 localhost
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8000";
  }
  return window.location.origin;
}

export const API_ORIGIN = getApiOrigin();

/**
 * Token 存储键
 */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;

// ─── 内存缓存（GET 请求短期缓存，减少重复网络请求） ───────────────────────────
type CacheEntry = { data: unknown; expireAt: number };
const memCache = new Map<string, CacheEntry>();

/** 从内存缓存中读取，若已过期则删除并返回 undefined */
export function getCached<T>(key: string): T | undefined {
  const entry = memCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expireAt) {
    memCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/** 写入内存缓存 */
export function setCache(key: string, data: unknown, ttlMs = 30_000) {
  memCache.set(key, { data, expireAt: Date.now() + ttlMs });
}

/** 手动使某个 key 的缓存失效（写操作后调用） */
export function invalidateCache(keyPrefix: string) {
  for (const key of memCache.keys()) {
    if (key.startsWith(keyPrefix)) memCache.delete(key);
  }
}

// ─── 请求去重（同一 URL 同时只发一个请求） ────────────────────────────────────
const pendingRequests = new Map<string, Promise<unknown>>();

/** 对 GET 请求进行去重，相同 URL 并发时只发一次网络请求 */
export function dedupeGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fetcher().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * 创建 Axios 实例
 */
export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 12000, // 12 秒超时（原 30s 过长，普通接口应快速响应）
});

// 缓存语言值，避免每次请求都读取 DOM
let _cachedLang = "zh-CN";
if (typeof document !== "undefined") {
  _cachedLang = document.documentElement.lang || navigator.language || "zh-CN";
  // 监听语言变化
  const observer = new MutationObserver(() => {
    _cachedLang = document.documentElement.lang || "zh-CN";
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}

/**
 * 请求拦截器
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      (config.headers as Record<string, string>)["Accept-Language"] = _cachedLang;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Token 刷新标志
 */
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * 响应拦截器
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 处理 401 错误(Token 过期)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新 token,将请求加入队列
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // 尝试刷新 token
      if (typeof window !== "undefined") {
        const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          try {
            const response = await api.post("/auth/refresh", { refreshToken });
            const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

            // 更新 token
            localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

            // 更新原始请求的 token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            // 处理队列中的请求
            failedRequestsQueue.forEach((callback) => {
              callback.resolve();
            });
            failedRequestsQueue = [];

            isRefreshing = false;

            // 重试原始请求
            return api(originalRequest);
          } catch (refreshError) {
            // 刷新失败,清除 token 并跳转登录
            failedRequestsQueue.forEach((callback) => {
              callback.reject(refreshError);
            });
            failedRequestsQueue = [];

            localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
            localStorage.removeItem("user");

            window.location.href = "/auth";
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // 没有 refresh token,直接跳转登录
          localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
          localStorage.removeItem("user");
          window.location.href = "/auth";
        }
      }
    }

    return Promise.reject(error);
  }
);

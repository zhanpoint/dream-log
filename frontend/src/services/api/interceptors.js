import notification from "@/utils/notification";
import { tokenManager } from '../auth/tokenManager';
import axios from 'axios';

/**
 * 检查是否是认证相关的API请求
 * @param {string} url - 请求URL
 * @returns {boolean} 是否是认证相关请求
 */
const isAuthError = (url) => {
    if (!url) return false;
    const authPaths = ['/auth/sessions/', '/users/', '/auth/tokens/', '/users/password/'];
    return authPaths.some(path => url.includes(path));
};

// 令牌刷新状态管理
let isRefreshing = false;
let failedQueue = [];

/**
 * 处理排队的请求
 * @param {Error|null} error - 错误对象，null表示成功
 * @param {string} token - 新的访问令牌
 * @param {Object} apiClient - API客户端实例
 */
const processQueue = (error, token = null, apiClient) => {
    failedQueue.forEach(({ resolve, reject, config }) => {
        if (error) {
            reject(error);
        } else {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(config));
        }
    });

    failedQueue = [];
};

/**
 * 刷新访问令牌
 * @returns {Promise<string>} 新的访问令牌
 */
const refreshAccessToken = async (apiClient) => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
        throw new Error('无刷新令牌');
    }

    try {
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/tokens/refresh/`, {
            refresh: refreshToken
        });

        const newAccessToken = response.data.access;
        const newRefreshToken = response.data.refresh; // DRF SimpleJWT可能返回新的刷新令牌

        // 保存新令牌
        tokenManager.setTokens(newAccessToken, newRefreshToken || refreshToken);

        return newAccessToken;
    } catch (error) {
        // 刷新失败，清除所有令牌
        tokenManager.clearAll();
        throw error;
    }
};

/**
 * 设置请求拦截器
 */
export const setupRequestInterceptor = (apiClient) => {
    apiClient.interceptors.request.use(async (config) => {
        // 检查是否需要认证
        const token = tokenManager.getAccessToken();

        if (token) {
            // 检查令牌是否即将过期
            if (tokenManager.shouldRefreshToken() && !isRefreshing) {
                isRefreshing = true;

                try {
                    const newToken = await refreshAccessToken(apiClient);
                    config.headers.Authorization = `Bearer ${newToken}`;

                    // 处理排队的请求
                    processQueue(null, newToken, apiClient);

                } catch (error) {
                    // 刷新失败
                    processQueue(error, null, apiClient);

                    // 触发重新登录
                    window.dispatchEvent(new CustomEvent('auth:required'));

                    return Promise.reject(error);
                } finally {
                    isRefreshing = false;
                }
            } else if (isRefreshing) {
                // 如果正在刷新，将请求加入队列
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, config });
                });
            } else {
                // 令牌有效，直接使用
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        return config;
    }, error => Promise.reject(error));
};

/**
 * 设置响应拦截器
 */
export const setupResponseInterceptor = (apiClient) => {
    apiClient.interceptors.response.use(response => response, async error => {
        const originalRequest = error.config;

        // 处理401错误（令牌过期或无效）
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // 如果正在刷新令牌，将请求加入队列
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, config: originalRequest });
                });
            }

            isRefreshing = true;

            try {
                const newToken = await refreshAccessToken(apiClient);

                // 处理排队的请求
                processQueue(null, newToken, apiClient);

                // 重试原始请求
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // 刷新失败，处理排队的请求
                processQueue(refreshError, null, apiClient);

                // 触发认证事件
                window.dispatchEvent(new CustomEvent('auth:required'));

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // 所有其他错误由调用方处理，不在拦截器中显示通知

        return Promise.reject(error);
    });
}; 
/**
 * 令牌管理器
 * 负责处理认证令牌和用户数据的存储、获取和清除
 */

/**
 * 解码JWT令牌（仅解码，不验证签名）
 * @param {string} token - JWT令牌
 * @returns {Object|null} 解码后的载荷
 */
const decodeJWT = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (error) {
        console.error('JWT解码失败:', error);
        return null;
    }
};

/**
 * 检查令牌是否即将过期（5分钟内过期）
 * @param {string} token - JWT令牌
 * @returns {boolean} 是否即将过期
 */
const isTokenNearExpiry = (token) => {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;

    // 如果5分钟内过期，则认为需要刷新
    return timeUntilExpiry < 300; // 300秒 = 5分钟
};

/**
 * 检查令牌是否已过期
 * @param {string} token - JWT令牌
 * @returns {boolean} 是否已过期
 */
const isTokenExpired = (token) => {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
};

export const tokenManager = {
    /**
     * 存储访问令牌和刷新令牌
     * @param {string} access - 访问令牌
     * @param {string} refresh - 刷新令牌
     */
    setTokens: (access, refresh) => {
        if (access) localStorage.setItem('accessToken', access);
        if (refresh) localStorage.setItem('refreshToken', refresh);
    },

    /**
     * 清除所有令牌
     */
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    /**
     * 获取访问令牌
     * @returns {string|null} 访问令牌
     */
    getAccessToken: () => localStorage.getItem('accessToken'),

    /**
     * 获取刷新令牌
     * @returns {string|null} 刷新令牌
     */
    getRefreshToken: () => localStorage.getItem('refreshToken'),

    /**
     * 检查访问令牌是否有效
     * @returns {boolean} 令牌是否有效
     */
    isAccessTokenValid: () => {
        const token = tokenManager.getAccessToken();
        return token && !isTokenExpired(token);
    },

    /**
     * 检查访问令牌是否即将过期
     * @returns {boolean} 是否需要刷新
     */
    shouldRefreshToken: () => {
        const token = tokenManager.getAccessToken();
        return token && isTokenNearExpiry(token);
    },

    /**
     * 获取令牌剩余有效时间（秒）
     * @returns {number} 剩余时间，-1表示已过期或无效
     */
    getTokenRemainingTime: () => {
        const token = tokenManager.getAccessToken();
        if (!token) return -1;

        const payload = decodeJWT(token);
        if (!payload || !payload.exp) return -1;

        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, payload.exp - currentTime);
    },

    /**
     * 存储用户数据
     * @param {Object} data - 用户数据
     */
    setUserData: (data) => {
        if (data) localStorage.setItem('user', JSON.stringify(data));
    },

    /**
     * 获取用户数据
     * @returns {Object|null} 用户数据
     */
    getUserData: () => {
        try {
            return JSON.parse(localStorage.getItem('user') || null);
        } catch {
            return null;
        }
    },

    /**
     * 清除用户数据
     */
    clearUserData: () => {
        localStorage.removeItem('user');
    },

    /**
     * 保存完整的认证响应（令牌和用户数据）
     * @param {Object} response - API响应对象
     */
    saveAuthResponse: (response) => {
        if (response?.data?.code === 200 || response?.data?.code === 201) {
            const { access, refresh, data } = response.data;
            if (access && refresh) {
                tokenManager.setTokens(access, refresh);
            }
            if (data) {
                tokenManager.setUserData(data);
            }
            return true;
        }
        return false;
    },

    /**
     * 清除所有认证数据
     */
    clearAll: () => {
        tokenManager.clearTokens();
        tokenManager.clearUserData();
    }
};

export default tokenManager; 
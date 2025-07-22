import apiClient from './client';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import { tokenManager } from '../auth/tokenManager';

// 设置拦截器
setupRequestInterceptor(apiClient);
setupResponseInterceptor(apiClient);

// 导出配置好的API客户端
export default apiClient;

// 认证工具
export const auth = {
    // 登出
    logout() {
        tokenManager.clearAll();
        window.dispatchEvent(new CustomEvent('auth:logout'));
    },

    // 检查认证状态
    isAuthenticated() {
        return tokenManager.isAccessTokenValid();
    },

    // 获取用户信息
    getCurrentUser() {
        return tokenManager.getUserData();
    },

    // 获取令牌剩余时间
    getTokenRemainingTime() {
        return tokenManager.getTokenRemainingTime();
    }
}; 
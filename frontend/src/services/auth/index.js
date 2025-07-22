import unifiedAuthService from './unifiedAuth';
import { tokenManager } from './tokenManager';
import profileManager from './profileManager';

/**
 * 统一认证服务入口
 * 整合所有认证相关功能
 */
export const auth = {
    // 认证状态检查
    isAuthenticated: () => unifiedAuthService.isAuthenticated(),
    getCurrentUser: () => unifiedAuthService.getCurrentUser(),

    // 登录、注册、重置密码
    login: (loginType, credentials) => unifiedAuthService.login(loginType, credentials),
    register: (registerType, userData) => unifiedAuthService.register(registerType, userData),
    resetPassword: (resetType, resetData) => unifiedAuthService.resetPassword(resetType, resetData),
    logout: () => unifiedAuthService.logout(),

    // 令牌管理
    refreshToken: () => unifiedAuthService.refreshToken(),
    getTokenRemainingTime: () => tokenManager.getTokenRemainingTime(),
    shouldRefreshToken: () => tokenManager.shouldRefreshToken(),

    // 用户资料管理
    updateUserProfile: (userData) => profileManager.updateUserProfile(userData),
    getUserProfile: () => profileManager.getUserProfile(),
};

// 默认导出
export default auth;

// 导出各个服务模块
export { default as unifiedAuthService } from './unifiedAuth';
export { tokenManager } from './tokenManager';
export { default as profileManager } from './profileManager'; 
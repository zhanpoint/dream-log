import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { tokenManager } from '../services/auth/tokenManager';
import unifiedAuthService from '../services/auth/unifiedAuth';
import { profileManager } from '@/services/auth/profileManager';

// 创建认证上下文
const AuthContext = createContext(null);

/**
 * 认证上下文提供者
 */
export function AuthProvider({ children }) {
    // 状态管理 - 使用单一的认证状态来源
    const [user, setUser] = useState(null);  // 用户信息:当前登录用户的详细资料
    const [isLoading, setIsLoading] = useState(true);  // 加载状态:是否正在加载认证状态

    // 获取当前token - 避免在useMemo中多次调用
    const [currentToken, setCurrentToken] = useState(null);

    // 监听token变化
    useEffect(() => {
        const token = tokenManager.getAccessToken();
        setCurrentToken(token);
    }, [user]); // 当用户状态变化时更新token

    // 计算认证状态 - 使用useMemo确保响应式更新
    const isAuthenticated = useMemo(() => {
        return !!(user && currentToken && tokenManager.isAccessTokenValid());
    }, [user, currentToken]);

    // 更新用户状态的统一方法
    const updateUserState = useCallback((userData) => {
        setUser(userData);
    }, []);

    // 清除认证状态的统一方法
    const clearAuthState = useCallback(() => {
        setUser(null);
        setCurrentToken(null);
        tokenManager.clearAll();
    }, []);

    // 初始化认证状态
    useEffect(() => {
        const initAuth = async () => {
            try {
                // 检查令牌是否有效
                const token = tokenManager.getAccessToken();
                if (token && tokenManager.isAccessTokenValid()) {
                    const userData = tokenManager.getUserData();
                    if (userData) {
                        updateUserState(userData);
                        setCurrentToken(token);
                        // 登录状态下始终拉取一次最新资料，获取 avatar_signed 等动态字段
                        try {
                            await profileManager.refreshUserProfileAndBroadcast();
                        } catch (_) { }
                    } else {
                        // 有令牌但没有用户数据，清除令牌
                        clearAuthState();
                    }
                } else {
                    // 令牌无效，清除所有数据
                    clearAuthState();
                }
            } catch (error) {
                clearAuthState();
            } finally {
                setIsLoading(false);
            }
        };

        // 处理认证要求事件
        const handleAuthRequired = () => {
            clearAuthState();
        };

        // 处理登出事件
        const handleLogout = () => {
            setUser(null);
        };

        // 监听认证事件
        window.addEventListener('auth:required', handleAuthRequired);
        window.addEventListener('auth:logout', handleLogout);
        window.addEventListener('auth:user-updated', (e) => {
            if (e?.detail) {
                updateUserState(e.detail);
            } else {
                const latest = tokenManager.getUserData();
                if (latest) updateUserState(latest);
            }
        });

        initAuth();

        return () => {
            window.removeEventListener('auth:required', handleAuthRequired);
            window.removeEventListener('auth:logout', handleLogout);
            window.removeEventListener('auth:user-updated', () => { });
        };
    }, [updateUserState, clearAuthState]);

    /**
     * 统一登录处理函数
     * @param {string} loginType - 登录类型: 'password' | 'sms' | 'email'
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<{success: boolean, message?: string, data?: Object, field?: string}>}
     */
    const login = useCallback(async (loginType, credentials) => {
        const result = await unifiedAuthService.login(loginType, credentials);

        if (result.success) {
            const token = tokenManager.getAccessToken();
            setCurrentToken(token);
            // 更新用户状态
            if (result.data) {
                updateUserState(result.data);
            }
        }

        return result;
    }, [updateUserState]);

    /**
     * 统一注册处理函数
     * @param {string} registerType - 注册类型: 'sms' | 'email'
     * @param {Object} userData - 用户数据
     * @returns {Promise<{success: boolean, message?: string, data?: Object, field?: string}>}
     */
    const register = useCallback(async (registerType, userData) => {
        const result = await unifiedAuthService.register(registerType, userData);

        if (result.success && result.data) {
            // 立即更新用户状态
            updateUserState(result.data);
            // 更新token状态
            const token = tokenManager.getAccessToken();
            setCurrentToken(token);
        }

        return result;
    }, [updateUserState]);

    /**
     * 统一密码重置处理函数
     * @param {string} method - 重置方式: 'current_password' | 'phone' | 'email'
     * @param {Object} resetData - 重置数据
     * @returns {Promise<{success: boolean, message?: string, field?: string}>}
     */
    const resetPassword = useCallback(async (method, resetData) => {
        return await unifiedAuthService.resetPassword(method, resetData);
    }, []);

    // 登出方法
    const logout = useCallback(async () => {
        await unifiedAuthService.logout();
        setUser(null);
        setCurrentToken(null);
    }, []);

    // 获取当前用户信息
    const getCurrentUser = useCallback(() => user, [user]);

    // 上下文提供的值 - 使用useMemo优化性能
    const value = useMemo(() => ({
        user,  // 用户信息
        isLoading,  // 加载状态
        isAuthenticated,  // 认证状态 - 基于user和token的计算值
        token: currentToken,  // 访问令牌 - WebSocket连接需要
        login,  // 统一登录方法
        register,  // 统一注册方法
        resetPassword,  // 统一密码重置方法
        logout,  // 登出方法
        getCurrentUser,  // 获取当前用户方法
        // Token相关的便捷方法
        getTokenRemainingTime: tokenManager.getTokenRemainingTime,
        shouldRefreshToken: tokenManager.shouldRefreshToken,
    }), [user, isLoading, isAuthenticated, currentToken, login, register, resetPassword, logout, getCurrentUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * 自定义Hook: 使用认证上下文
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return context;
}

export default AuthContext; 
import React, { createContext } from 'react';
import api from '@/services/api';

/**
 * 默认功能开关配置
 */
const DEFAULT_FEATURE_FLAGS = {
    SMS_SERVICE_ENABLED: false,
    EMAIL_SERVICE_ENABLED: true,
    PASSWORD_LOGIN_ENABLED: true,
};

/**
 * 创建功能开关Promise
 * 在应用启动时创建一次，全局共享
 */
const featureFlagsPromise = api.get('/system/features/')
    .then(response => {
        if (response.data && response.data.code === 200 && response.data.data) {
            return response.data.data;
        } else {
            console.warn('功能开关API返回格式异常，使用默认配置');
            return DEFAULT_FEATURE_FLAGS;
        }
    })
    .catch(error => {
        console.error('获取功能开关失败，使用默认配置:', error.message);
        return DEFAULT_FEATURE_FLAGS;
    });

/**
 * 功能开关Context
 */
const FeatureFlagContext = createContext(null);

/**
 * 功能开关Provider组件
 * 使用React 19的use API处理异步数据
 */
export function FeatureFlagProvider({ children }) {
    // 使用React 19的use API直接处理Promise
    const features = React.use(featureFlagsPromise);

    /**
     * 检查功能是否启用
     * @param {string} feature - 功能名称
     * @returns {boolean} - 是否启用
     */
    const isFeatureEnabled = (feature) => {
        return !!features[feature];
    };

    /**
     * 获取可用的登录方式
     * @returns {Array} - 可用的登录方式列表
     */
    const getAvailableLoginMethods = () => {
        const methods = [];
        if (isFeatureEnabled('PASSWORD_LOGIN_ENABLED')) methods.push('password');
        if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('sms');
        if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
        return methods;
    };

    /**
     * 获取可用的注册方式
     * @returns {Array} - 可用的注册方式列表
     */
    const getAvailableRegisterMethods = () => {
        const methods = [];
        if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('phone');
        if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
        return methods;
    };

    /**
     * 获取可用的密码重置方式
     * @returns {Array} - 可用的密码重置方式列表
     */
    const getAvailableResetMethods = () => {
        const methods = [];
        if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('phone');
        if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
        return methods;
    };

    const value = {
        features,
        isFeatureEnabled,
        getAvailableLoginMethods,
        getAvailableRegisterMethods,
        getAvailableResetMethods,
    };

    return (
        <FeatureFlagContext.Provider value={value}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

/**
 * 使用功能开关的自定义Hook
 * @returns {Object} 功能开关状态和方法
 */
export function useFeatureFlags() {
    const context = React.use(FeatureFlagContext);

    if (context === null) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }

    return context;
}

export default FeatureFlagContext;

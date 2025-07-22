/**
 * API 端点常量
 * 集中管理所有API路径
 */

// 基础配置
export const API_BASE_URL = '/api';

// 认证相关端点
export const AUTH_ENDPOINTS = {
    // 登录相关
    LOGIN: '/auth/sessions/',
    LOGOUT: '/auth/logout/',
    REGISTER: '/auth/register/',

    // 令牌管理
    TOKEN_REFRESH: '/auth/tokens/refresh/',
    TOKEN_VERIFY: '/auth/tokens/verify/',

    // 密码重置
    PASSWORD_RESET: '/auth/password/reset/',
    PASSWORD_RESET_CONFIRM: '/auth/password/reset/confirm/',

    // 验证码
    SMS_CODE: '/auth/sms/code/',
    EMAIL_CODE: '/auth/email/code/',

    // 用户信息
    USER_PROFILE: '/auth/user/',
    USER_UPDATE: '/auth/user/update/',
};

// 系统相关端点
export const SYSTEM_ENDPOINTS = {
    // 功能开关
    FEATURES: '/system/features/',

    // 健康检查
    HEALTH: '/system/health/',
    VERSION: '/system/version/',
};

// 通知相关端点
export const NOTIFICATION_ENDPOINTS = {
    // 短信通知
    SMS_SEND: '/notifications/sms/send/',
    SMS_VERIFY: '/notifications/sms/verify/',

    // 邮件通知
    EMAIL_SEND: '/notifications/email/send/',
    EMAIL_VERIFY: '/notifications/email/verify/',

    // 系统通知
    SYSTEM_NOTIFICATIONS: '/notifications/system/',
    USER_NOTIFICATIONS: '/notifications/user/',
};


// 完整的API端点集合
export const API_ENDPOINTS = {
    AUTH: AUTH_ENDPOINTS,
    SYSTEM: SYSTEM_ENDPOINTS,
    NOTIFICATIONS: NOTIFICATION_ENDPOINTS,
};

// 默认导出
export default API_ENDPOINTS; 
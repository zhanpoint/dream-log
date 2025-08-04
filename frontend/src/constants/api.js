/**
 * API 端点常量
 * 集中管理所有API路径, 确保与后端RESTful规范一致
 */

// 基础配置
export const API_BASE_URL = '/api';

// 认证相关端点 (Prefix: /api/auth)
export const AUTH_ENDPOINTS = {
    SESSIONS: `${API_BASE_URL}/auth/sessions/`,
    TOKEN_OBTAIN: `${API_BASE_URL}/auth/tokens/`,
    TOKEN_REFRESH: `${API_BASE_URL}/auth/tokens/refresh/`,
    TOKEN_VERIFY: `${API_BASE_URL}/auth/tokens/verify/`,
    PASSWORD_RESET: `${API_BASE_URL}/auth/password/reset/`,
};

// 用户管理相关端点 (Prefix: /api/users)
export const USER_ENDPOINTS = {
    // GET, PUT, PATCH, DELETE /api/users/{id}/
    // POST /api/users/
    USER_DETAIL: (userId) => `${API_BASE_URL}/users/${userId}/`,
    USER_LIST: `${API_BASE_URL}/users/`,
};

// 验证码相关端点 (Prefix: /api/verifications)
export const VERIFICATION_ENDPOINTS = {
    SMS: `${API_BASE_URL}/verifications/sms/`,
    EMAIL: `${API_BASE_URL}/verifications/email/`,
};

// 系统相关端点 (Prefix: /api/system)
export const SYSTEM_ENDPOINTS = {
    FEATURES: `${API_BASE_URL}/system/features/`,
};

// 梦境相关端点 (Prefix: /api/dream)
export const DREAM_ENDPOINTS = {
    DREAMS: `${API_BASE_URL}/dream/dreams/`,
    DREAM_DETAIL: (dreamId) => `${API_BASE_URL}/dream/dreams/${dreamId}/`,
    CATEGORIES: `${API_BASE_URL}/dream/dreams/categories/`,
    TAGS: `${API_BASE_URL}/dream/dreams/tags/`,
};

// 文件上传相关端点 (Prefix: /api/dream/files)
export const FILE_ENDPOINTS = {
    UPLOAD_SIGNATURE: `${API_BASE_URL}/dream/files/upload-signature/`,
    COMPLETE_UPLOAD: `${API_BASE_URL}/dream/files/complete-upload/`,
    MARK_FOR_DELETION: `${API_BASE_URL}/dream/files/mark-for-deletion/`,
};

// 完整的API端点集合
export const API_ENDPOINTS = {
    AUTH: AUTH_ENDPOINTS,
    USER: USER_ENDPOINTS,
    VERIFICATION: VERIFICATION_ENDPOINTS,
    SYSTEM: SYSTEM_ENDPOINTS,
    DREAM: DREAM_ENDPOINTS,
    FILE: FILE_ENDPOINTS,
};

export default API_ENDPOINTS;

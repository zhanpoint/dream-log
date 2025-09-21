/**
 * UI 相关常量
 * 管理界面元素的配置项
 */

// 表单验证规则
export const VALIDATION_RULES = {
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 20,
        PATTERN: /^[a-zA-Z0-9_]+$/,
    },
    PASSWORD: {
        MIN_LENGTH: 8,
        PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)/,
    },
    PHONE: {
        PATTERN: /^1[3-9]\d{9}$/,
    },
    EMAIL: {
        PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    VERIFICATION_CODE: {
        LENGTH: 6,
        PATTERN: /^\d{6}$/,
    },
};

// 分页配置
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_VISIBLE_PAGES: 7,
};

// 文件上传配置
export const FILE_UPLOAD = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
};

// 通知配置
export const NOTIFICATION_CONFIG = {
    DEFAULT_DURATION: 3000,
    SUCCESS_DURATION: 2000,
    ERROR_DURATION: 5000,
    WARNING_DURATION: 4000,
    INFO_DURATION: 3000,
};

// 默认导出
export default {
    VALIDATION_RULES,
    PAGINATION,
    FILE_UPLOAD,
    NOTIFICATION_CONFIG,
}; 
/**
 * UI 相关常量
 * 管理界面元素的配置项
 */

// 颜色配置
export const COLORS = {
    PRIMARY: '#6366f1',
    SECONDARY: '#f59e0b',
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#06b6d4',
};


// 响应断点
export const BREAKPOINTS = {
    XS: '480px',
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
};

// 动画持续时间
export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
};

// Z-index 层级
export const Z_INDEX = {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
};

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

// 图标尺寸
export const ICON_SIZES = {
    XS: 'h-3 w-3',
    SM: 'h-4 w-4',
    MD: 'h-5 w-5',
    LG: 'h-6 w-6',
    XL: 'h-8 w-8',
    '2XL': 'h-10 w-10',
};

// 默认导出
export default {
    COLORS,
    BREAKPOINTS,
    ANIMATION_DURATIONS,
    Z_INDEX,
    VALIDATION_RULES,
    PAGINATION,
    FILE_UPLOAD,
    NOTIFICATION_CONFIG,
    ICON_SIZES,
}; 
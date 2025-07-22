/**
 * 路由路径常量
 * 集中管理所有页面路由
 */

// 主要页面路由
export const ROUTES = {
    // 首页和主要功能
    HOME: '/',
    DASHBOARD: '/dashboard',

    // 认证相关路由
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',

    // 用户相关路由
    PROFILE: '/profile',
    SETTINGS: '/settings',

    // 搜索和探索
    SEARCH: '/search',
    EXPLORE: '/explore',

    // 错误页面
    NOT_FOUND: '/404',
    ERROR: '/error',
    UNAUTHORIZED: '/401',
    FORBIDDEN: '/403',
};

// 路由生成器函数
export const ROUTE_BUILDERS = {
    /**
     * 生成梦境详情路由
     * @param {string|number} dreamId - 梦境ID
     * @returns {string} 梦境详情路由
     */
    dreamDetail: (dreamId) => `/dreams/${dreamId}`,

    /**
     * 生成编辑梦境路由
     * @param {string|number} dreamId - 梦境ID
     * @returns {string} 编辑梦境路由
     */
    editDream: (dreamId) => `/edit-dream/${dreamId}`,

    /**
     * 生成搜索路由
     * @param {string} query - 搜索关键词
     * @returns {string} 搜索路由
     */
    search: (query) => `/search?q=${encodeURIComponent(query)}`,

    /**
     * 生成用户资料路由
     * @param {string|number} userId - 用户ID
     * @returns {string} 用户资料路由
     */
    userProfile: (userId) => `/users/${userId}`,

    /**
     * 生成分类筛选路由
     * @param {string} category - 梦境分类
     * @returns {string} 分类筛选路由
     */
    categoryFilter: (category) => `/dreams?category=${encodeURIComponent(category)}`,

    /**
     * 生成标签筛选路由
     * @param {string} tag - 标签名称
     * @returns {string} 标签筛选路由
     */
    tagFilter: (tag) => `/dreams?tag=${encodeURIComponent(tag)}`,
};

// 导航菜单配置
export const NAVIGATION_MENU = [
    {
        name: '首页',
        path: ROUTES.HOME,
        icon: 'Home',
        requireAuth: false,
    },
    {
        name: '我的梦境',
        path: ROUTES.MY_DREAMS,
        icon: 'Moon',
        requireAuth: true,
    },
    {
        name: '创建梦境',
        path: ROUTES.CREATE_POST,
        icon: 'Plus',
        requireAuth: true,
    },
    {
        name: '探索',
        path: ROUTES.EXPLORE,
        icon: 'Compass',
        requireAuth: false,
    },
    {
        name: '搜索',
        path: ROUTES.SEARCH,
        icon: 'Search',
        requireAuth: false,
    },
];

// 认证相关路由配置
export const AUTH_ROUTES = [
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.FORGOT_PASSWORD,
    ROUTES.RESET_PASSWORD,
];

// 需要认证的路由
export const PROTECTED_ROUTES = [
    ROUTES.MY_DREAMS,
    ROUTES.CREATE_POST,
    ROUTES.CREATE_DREAM,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    // 动态路由需要在组件中检查
];

// 公开路由（不需要认证）
export const PUBLIC_ROUTES = [
    ROUTES.HOME,
    ROUTES.EXPLORE,
    ROUTES.SEARCH,
    ...AUTH_ROUTES,
];

// 面包屑配置
export const BREADCRUMB_CONFIG = {
    [ROUTES.HOME]: [
        { name: '首页', path: ROUTES.HOME }
    ],
    [ROUTES.MY_DREAMS]: [
        { name: '首页', path: ROUTES.HOME },
        { name: '我的梦境', path: ROUTES.MY_DREAMS }
    ],
    [ROUTES.CREATE_POST]: [
        { name: '首页', path: ROUTES.HOME },
        { name: '我的梦境', path: ROUTES.MY_DREAMS },
        { name: '创建梦境', path: ROUTES.CREATE_POST }
    ],
    [ROUTES.PROFILE]: [
        { name: '首页', path: ROUTES.HOME },
        { name: '个人资料', path: ROUTES.PROFILE }
    ],
    [ROUTES.SETTINGS]: [
        { name: '首页', path: ROUTES.HOME },
        { name: '设置', path: ROUTES.SETTINGS }
    ],
};

// 页面标题配置
export const PAGE_TITLES = {
    [ROUTES.HOME]: 'Dream Log - 记录你的梦想之旅',
    [ROUTES.LOGIN]: '登录 - Dream Log',
    [ROUTES.REGISTER]: '注册 - Dream Log',
    [ROUTES.FORGOT_PASSWORD]: '忘记密码 - Dream Log',
    [ROUTES.MY_DREAMS]: '我的梦境 - Dream Log',
    [ROUTES.CREATE_POST]: '创建梦境 - Dream Log',
    [ROUTES.PROFILE]: '个人资料 - Dream Log',
    [ROUTES.SETTINGS]: '设置 - Dream Log',
    [ROUTES.SEARCH]: '搜索 - Dream Log',
    [ROUTES.EXPLORE]: '探索梦境 - Dream Log',
    [ROUTES.NOT_FOUND]: '页面未找到 - Dream Log',
    [ROUTES.ERROR]: '系统错误 - Dream Log',
};

// 默认导出
export default {
    ROUTES,
    ROUTE_BUILDERS,
    NAVIGATION_MENU,
    AUTH_ROUTES,
    PROTECTED_ROUTES,
    PUBLIC_ROUTES,
    BREADCRUMB_CONFIG,
    PAGE_TITLES,
}; 
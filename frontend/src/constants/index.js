/**
 * 常量统一导出
 * 集中管理所有常量
 */

// 导入所有模块
import * as API from './api';
import * as UI from './ui';
import * as ROUTES from './routes';

// API 相关常量
export * from './api';
export { default as API_ENDPOINTS } from './api';

// UI 相关常量
export * from './ui';
export { default as UI_CONSTANTS } from './ui';

// 路由相关常量
export * from './routes';
export { default as ROUTE_CONSTANTS } from './routes';

// 默认导出
export default {
    ...API,
    ...UI,
    ...ROUTES,
}; 
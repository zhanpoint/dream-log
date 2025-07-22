/**
 * Hooks 统一导出
 * 集中管理所有自定义 hooks
 */

// 导入用于默认导出的hooks
import { useAuth } from './useAuth';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';

// 认证相关 hooks
export { useAuth } from './useAuth';

// 通用工具 hooks
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';

// 默认导出常用的hooks
export default {
    useAuth,
    useDebounce,
    useLocalStorage,
}; 
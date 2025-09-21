/**
 * Hooks 统一导出
 * 集中管理所有自定义 hooks
 */

// 导入用于默认导出的hooks
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';
import { useAutoScroll } from './useAutoScroll';

// 通用工具 hooks
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { useAutoScroll } from './useAutoScroll';

// 默认导出常用的hooks
export default {
    useDebounce,
    useLocalStorage,
    useAutoScroll,
}; 
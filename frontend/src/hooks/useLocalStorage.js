import { useState } from 'react';

/**
 * 本地存储 Hook
 * @param {string} key - 存储键名
 * @param {any} initialValue - 初始值
 * @returns {[any, Function]} [存储的值, 设置值的函数]
 */
export function useLocalStorage(key, initialValue) {
    // 状态存储值
    const [storedValue, setStoredValue] = useState(() => {
        try {
            // 从localStorage获取值
            const item = window.localStorage.getItem(key);
            // 解析存储的JSON，如果没有则返回初始值
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // 如果出错，返回初始值
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // 返回包装后的setValue函数，该函数会持久化新值到localStorage
    const setValue = (value) => {
        try {
            // 允许值是一个函数，这样我们就有了与useState相同的API
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // 保存状态
            setStoredValue(valueToStore);

            // 保存到localStorage
            if (valueToStore === undefined) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}

export default useLocalStorage; 
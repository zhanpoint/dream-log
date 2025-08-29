import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * 主题上下文 - 管理亮色/暗色主题切换
 */
const ThemeContext = createContext();

/**
 * 主题提供者组件
 * @param {Object} props - 组件属性
 * @param {ReactNode} props.children - 子组件
 */
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('dark'); // 默认暗色主题符合梦境应用的氛围
    const [isLoaded, setIsLoaded] = useState(false);

    // 检测系统主题偏好
    useEffect(() => {
        const savedTheme = localStorage.getItem('dream-log-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            setTheme(savedTheme);
        } else if (systemPrefersDark) {
            setTheme('dark');
        } else {
            setTheme('light');
        }

        setIsLoaded(true);
    }, []);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (!localStorage.getItem('dream-log-theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // 应用主题到 document
    useEffect(() => {
        if (isLoaded) {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.className = theme;
        }
    }, [theme, isLoaded]);

    /**
     * 切换主题
     */
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('dream-log-theme', newTheme);
    };

    /**
     * 设置特定主题
     * @param {string} newTheme - 主题名称
     */
    const setThemeMode = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('dream-log-theme', newTheme);
    };

    const value = {
        theme,
        toggleTheme,
        setTheme: setThemeMode,
        isLoaded
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * 使用主题的 Hook
 * @returns {Object} 主题上下文值
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme 必须在 ThemeProvider 内部使用');
    }
    return context;
};

export default ThemeContext;
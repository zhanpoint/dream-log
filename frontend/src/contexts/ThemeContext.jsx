import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // 从 localStorage 获取保存的主题，默认为 system
        return localStorage.getItem('dream-theme') || 'system';
    });

    // 应用主题到 document
    useEffect(() => {
        const root = document.documentElement;

        // 移除之前的主题类
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            // 使用系统主题
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            // 使用用户选择的主题
            root.classList.add(theme);
        }

        // 保存到 localStorage
        localStorage.setItem('dream-theme', theme);
    }, [theme]);

    // 监听系统主题变化
    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            const handleChange = () => {
                const root = document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(mediaQuery.matches ? 'dark' : 'light');
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const setThemeMode = (newTheme) => {
        setTheme(newTheme);
    };

    // 获取当前实际应用的主题（解析 system）
    const getActualTheme = () => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    };

    const value = {
        theme,
        setTheme: setThemeMode,
        actualTheme: getActualTheme(),
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}; 
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 页面预加载器 - React 19 优化版本
 * 轻量级智能预加载，减少延迟
 */
const PagePreloader = () => {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        // 使用requestIdleCallback在浏览器空闲时预加载
        const preloadWhenIdle = () => {
            const preload = () => {
                if (isAuthenticated) {
                    // 【修复】完全避免预加载编辑器相关页面，防止提前触发 TDZ
                    import('../../pages/dreams/MyDreams').catch(() => { });
                    import('../../pages/dreams/DreamDetail').catch(() => { });
                    import('../../pages/core/StatisticsPage').catch(() => { });
                    // 不再预加载 CreateDream 和 EditDream，避免编辑器依赖问题
                } else {
                    // 未登录用户：预加载认证页面
                    import('../../pages/auth/LoginPage').catch(() => { });
                }
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(preload, { timeout: 3000 }); // 增加超时时间
            } else {
                // 降级方案，增加延迟时间
                setTimeout(preload, 2000);
            }
        };

        preloadWhenIdle();
    }, [isAuthenticated, isLoading]);

    return null;
};

export default PagePreloader;
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
                    // 已登录用户：预加载核心页面
                    import('../../pages/CreateDream').catch(() => { });
                    import('../../pages/MyDreams').catch(() => { });
                } else {
                    // 未登录用户：预加载认证页面
                    import('../../pages/LoginPage').catch(() => { });
                }
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(preload, { timeout: 2000 });
            } else {
                // 降级方案
                setTimeout(preload, 1000);
            }
        };

        preloadWhenIdle();
    }, [isAuthenticated, isLoading]);

    return null;
};

export default PagePreloader;
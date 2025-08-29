import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * 私有路由组件 - React 19 简洁版本
 * 高性能，快速响应的认证保护
 */
export function PrivateRoute({ children }) {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuth();

    // 简洁的加载状态
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border">
                    <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground">
                        验证身份中...
                    </p>
                </div>
            </div>
        );
    }

    // 未认证则重定向到登录页
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 已认证则渲染子组件
    return children;
}

export default PrivateRoute; 
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * 私有路由组件 - 保护需要认证的路由
 */
export function PrivateRoute({ children }) {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuth();

    // 加载中显示状态
    if (isLoading) {
        return <div className="loading-container">正在验证身份...</div>;
    }

    // 未认证则重定向到登录页
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 已认证则渲染子组件
    return children;
}

export default PrivateRoute; 
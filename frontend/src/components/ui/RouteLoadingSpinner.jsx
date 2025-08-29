import React from 'react';

/**
 * 路由懒加载时的简洁加载指示器 - React 19 优化版本
 * 轻量级，高性能，快速响应
 */
const RouteLoadingSpinner = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/80 backdrop-blur-sm border">
                {/* 简洁的旋转加载器 */}
                <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />

                {/* 简洁的加载文本 */}
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                        正在加载...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RouteLoadingSpinner;

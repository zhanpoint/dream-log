import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { I18nProvider } from "./contexts/I18nContext";
import PagePreloader from "./components/ui/PagePreloader";
import { LayoutController } from "./components/i18n/LayoutController";
import "./styles/i18n/layout.css";

/**
 * 全局加载组件
 * 使用更简洁的加载界面替代之前的LoadingScreen
 */
function AppLoadingFallback() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground">Dreamlog</h2>
                    <p className="text-sm text-muted-foreground">正在启动...</p>
                </div>
            </div>
        </div>
    );
}

/**
 * 应用内容组件
 * 使用React 19的最佳实践，无需手动管理加载状态
 */
function AppContent() {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    // 判断是否为认证页面
    const isAuthPage = ['/login', '/register', '/reset-password'].includes(location.pathname);

    // 认证页面使用自己的完整布局，不显示主导航栏和页脚
    if (isAuthPage) {
        return <Outlet />;
    }

    return (
        <div className="home-container">
            <Navbar />
            <main className="main-content">
                <Outlet />
            </main>
            {/* 页面预加载器 - 智能预加载用户可能访问的页面 */}
            <PagePreloader />
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <Suspense fallback={<AppLoadingFallback />}>
                    <AuthProvider>
                        <I18nProvider>
                            <LayoutController>
                                <FeatureFlagProvider>
                                    <AppContent />
                                </FeatureFlagProvider>
                            </LayoutController>
                        </I18nProvider>
                    </AuthProvider>
                </Suspense>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
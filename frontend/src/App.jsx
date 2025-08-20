import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";

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
                    <h2 className="text-lg font-semibold text-foreground">梦境门户</h2>
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
            {/* Footer组件仅在首页显示 */}
            {isHomePage && <Footer />}
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <Suspense fallback={<AppLoadingFallback />}>
                <FeatureFlagProvider>
                    <AuthProvider>
                        <AppContent />
                    </AuthProvider>
                </FeatureFlagProvider>
            </Suspense>
        </ThemeProvider>
    );
}

export default App;
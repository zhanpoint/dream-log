import React, { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import PrivateRoute from "./features/auth/components/PrivateRoute";
import RouteLoadingSpinner from "./components/ui/RouteLoadingSpinner";

// 懒加载页面组件 - 提升首次访问性能
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage").then(module => ({ default: module.LoginPage })));
const Register = lazy(() => import("./pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

// 需要认证的页面组件 - 按需加载
const CreateDream = lazy(() => import("./pages/CreateDream"));
const DreamDetail = lazy(() => import("./pages/DreamDetail"));
const MyDreams = lazy(() => import("./pages/MyDreams"));
const EditDream = lazy(() => import("./pages/EditDream"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const DreamAssistantPage = lazy(() => import("./pages/DreamAssistantPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

/**
 * 懒加载组件包装器 - 提供统一的加载状态
 */
const LazyWrapper = ({ children }) => (
    <Suspense fallback={<RouteLoadingSpinner />}>
        {children}
    </Suspense>
);

/**
 * 应用路由配置 - 懒加载优化版本
 * 所有路由都在App组件下，确保功能开关在全局可用
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: (
                    <LazyWrapper>
                        <HomePage />
                    </LazyWrapper>
                ),
            },
            {
                path: "login",
                element: (
                    <LazyWrapper>
                        <LoginPage />
                    </LazyWrapper>
                ),
            },
            {
                path: "register",
                element: (
                    <LazyWrapper>
                        <Register />
                    </LazyWrapper>
                ),
            },
            {
                path: "reset-password",
                element: (
                    <LazyWrapper>
                        <ResetPasswordPage />
                    </LazyWrapper>
                ),
            },
            {
                path: "dreams/create",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <CreateDream />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "my-dreams",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <MyDreams />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "dreams/:id",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <DreamDetail />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "dreams/:id/edit",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <EditDream />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "statistics",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <StatisticsPage />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "assistant",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <DreamAssistantPage />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
            {
                path: "settings",
                element: (
                    <PrivateRoute>
                        <LazyWrapper>
                            <SettingsPage />
                        </LazyWrapper>
                    </PrivateRoute>
                ),
            },
        ],
    },
]);

export default router; 
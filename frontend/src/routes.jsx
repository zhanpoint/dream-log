import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Register from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import CreateDream from "./pages/CreateDream";
import DreamDetail from "./pages/DreamDetail";
import MyDreams from "./pages/MyDreams";
import EditDream from "./pages/EditDream";
import StatisticsPage from "./pages/StatisticsPage";
import PrivateRoute from "./features/auth/components/PrivateRoute";

/**
 * 应用路由配置
 * 所有路由都在App组件下，确保功能开关在全局可用
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: "login",
                element: <LoginPage />,
            },
            {
                path: "register",
                element: <Register />,
            },
            {
                path: "reset-password",
                element: <ResetPasswordPage />,
            },
            {
                path: "dreams/create",
                element: (
                    <PrivateRoute>
                        <CreateDream />
                    </PrivateRoute>
                ),
            },
            {
                path: "my-dreams",
                element: (
                    <PrivateRoute>
                        <MyDreams />
                    </PrivateRoute>
                ),
            },
            {
                path: "dreams/:id",
                element: (
                    <PrivateRoute>
                        <DreamDetail />
                    </PrivateRoute>
                ),
            },
            {
                path: "dreams/:id/edit",
                element: (
                    <PrivateRoute>
                        <EditDream />
                    </PrivateRoute>
                ),
            },
            {
                path: "statistics",
                element: (
                    <PrivateRoute>
                        <StatisticsPage />
                    </PrivateRoute>
                ),
            },
        ],
    },
]);

export default router; 
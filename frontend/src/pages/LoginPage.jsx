import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DualLoginForm } from "@/features/auth/components/DualLoginForm";
import "@/styles/features/auth.css";

/**
 * 登录页面组件
 */
function LoginPage() {
    return (
        <div className="auth-page">
            {/* 简化版导航栏，包含返回按钮和品牌logo */}
            <header className="auth-header">
                <div className="auth-header-container">
                    <Link to="/" className="auth-back-button">
                        <ArrowLeft />
                        返回首页
                    </Link>

                    <Link to="/" className="auth-logo">
                        <img src="/assets/logo.svg" className="auth-logo-image" alt="梦境门户" />
                        <span className="auth-logo-text">梦境门户</span>
                    </Link>
                </div>
            </header>

            <div className="auth-container">
                <div className="auth-content">
                    <DualLoginForm />
                </div>

                {/* 背景装饰元素 */}
                <div className="bg-decoration bg-decoration-1"></div>
                <div className="bg-decoration bg-decoration-2"></div>
                <div className="bg-decoration bg-decoration-3"></div>
            </div>
        </div>
    );
}

export { LoginPage };
export default LoginPage; 